#!/usr/bin/env python3
"""
Build chunked SQLite databases from Novel Hub JSONL data.

This script processes JSONL files from novel_hub release and creates
chunked SQLite databases based on activity level:

- Cold: 断更, 已完结 (inactive, never updated)
- Warm: 完结A, 断更A (low activity)
- Hot: 连载中 (high activity, updated monthly)

下架 (removed) data is excluded as it has no value.
"""

import json
import sqlite3
import os
import sys
import hashlib
from pathlib import Path
from typing import Optional

from validators import (
    should_skip_novel,
    get_status_id,
    get_genre_id,
    get_ptype_id,
    normalize_tags,
)

# Chunk configuration
CHUNKS = {
    'hot': {
        'statuses': ['连载中', '完结A', '断更A'],
        'description': 'Active data (updated monthly/quarterly)',
    },
    'cold_1': {
        'statuses': ['断更', '已完结'],
        'description': 'Inactive data - author hash partition 0',
    },
    'cold_2': {
        'statuses': ['断更', '已完结'],
        'description': 'Inactive data - author hash partition 1',
    },
    'cold_3': {
        'statuses': ['断更', '已完结'],
        'description': 'Inactive data - author hash partition 2',
    },
}




def create_database(db_path: str, is_hot: bool = False) -> sqlite3.Connection:
    """Create SQLite database with schema and indexes.
    
    Args:
        db_path: Path to the database file
        is_hot: If True, create more indexes for frequent queries
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create novels table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS novels (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT,
            genre INTEGER DEFAULT 1,
            status INTEGER DEFAULT 1,
            ptype INTEGER DEFAULT 1,
            has_banner BOOLEAN DEFAULT 0,
            word_num INTEGER,
            click_num INTEGER,
            praise_num INTEGER,
            like_num INTEGER,
            comment_num INTEGER,
            review_num INTEGER,
            contest_id INTEGER,
            cover TEXT,
            last_update DATETIME
        )
    ''')
    
    # Create authors table (with pre-computed stats)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS authors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            top_novel_id INTEGER,
            top_novel_title TEXT,
            top_novel_clicks INTEGER DEFAULT 0
        )
    ''')
    
    # Create tags table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    ''')
    
    # Create novel_tags table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS novel_tags (
            novel_id INTEGER,
            tag_id INTEGER,
            PRIMARY KEY (novel_id, tag_id),
            FOREIGN KEY (novel_id) REFERENCES novels(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        )
    ''')
    
    # Create contests table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    ''')
    
    # Create ALL indexes upfront (database is read-only in app)
    # Novel indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_genre ON novels(genre)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_ptype ON novels(ptype)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_click_num ON novels(click_num DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_author ON novels(author)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_has_banner ON novels(has_banner)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novels_last_update ON novels(last_update DESC)')
    
    # Tag indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novel_tags_novel_id ON novel_tags(novel_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_novel_tags_tag_id ON novel_tags(tag_id)')
    
    # Author indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_authors_clicks ON authors(top_novel_clicks DESC)')
    
    conn.commit()
    return conn


def insert_novel(conn: sqlite3.Connection, novel: dict) -> None:
    """Insert a novel into the database."""
    cursor = conn.cursor()
    
    # Get mapped values using validators
    status = get_status_id(novel.get('status', '其他'))
    genre = get_genre_id(novel.get('genre', '其他'))
    ptype = get_ptype_id(novel.get('ptype', '其他'))
    
    # Handle author
    author_name = novel.get('author')
    if author_name:
        cursor.execute('INSERT OR IGNORE INTO authors (name) VALUES (?)', (author_name,))
    
    # Handle contest
    contest_name = novel.get('contest')
    contest_id = None
    if contest_name:
        cursor.execute('INSERT OR IGNORE INTO contests (name) VALUES (?)', (contest_name,))
        cursor.execute('SELECT id FROM contests WHERE name = ?', (contest_name,))
        contest_id = cursor.fetchone()[0]
    
    # Insert novel
    cursor.execute('''
        INSERT OR REPLACE INTO novels 
        (id, title, author, genre, status, ptype, has_banner, 
         word_num, click_num, praise_num, like_num, comment_num, 
         review_num, contest_id, cover, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        novel['nid'],
        novel['title'],
        author_name,
        genre,
        status,
        ptype,
        novel.get('has_banner', False),
        novel.get('word_num'),
        novel.get('click_num'),
        novel.get('praise_num'),
        novel.get('like_num'),
        novel.get('comment_num'),
        novel.get('review_num'),
        contest_id,
        novel.get('cover'),
        novel.get('last_update'),
    ))
    
    # Handle tags (normalize to handle nested lists)
    tags = normalize_tags(novel.get('tags', []))
    for tag_name in tags:
        cursor.execute('INSERT OR IGNORE INTO tags (name) VALUES (?)', (tag_name,))
        cursor.execute('SELECT id FROM tags WHERE name = ?', (tag_name,))
        tag_id = cursor.fetchone()[0]
        cursor.execute('''
            INSERT OR IGNORE INTO novel_tags (novel_id, tag_id) 
            VALUES (?, ?)
        ''', (novel['nid'], tag_id))


def get_chunk_category(status: str, author: str = "") -> Optional[str]:
    """Get the chunk category for a given status.
    
    Cold data is split by author hash to keep同一作者的小说在同一chunk,
    减少每个chunk的authors表大小.
    
    Returns:
        Chunk name or None if status should be excluded (下架)
    """
    # Exclude 下架 (removed) data
    if status == '下架':
        return None
    
    # Cold statuses: split by author hash
    cold_statuses = ['断更', '已完结']
    if status in cold_statuses:
        # hash author name to 0/1/2
        h = int(hashlib.md5(author.encode('utf-8')).hexdigest(), 16)
        part = (h % 3) + 1  # 1, 2, or 3
        return f'cold_{part}'
    
    # Hot statuses
    for chunk_name, config in CHUNKS.items():
        if chunk_name.startswith('cold'):
            continue
        if status in config['statuses']:
            return chunk_name
    
    return None


def process_jsonl_files(jsonl_dir: str, output_dir: str) -> dict:
    """Process JSONL files and create chunked SQLite databases.
    
    Returns:
        Dictionary with statistics for each chunk
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Initialize chunk connections
    connections = {}
    stats = {}
    
    for chunk_name, chunk_config in CHUNKS.items():
        db_path = os.path.join(output_dir, f'{chunk_name}_chunk.sqlite')
        is_hot = (chunk_name == 'hot')
        connections[chunk_name] = create_database(db_path, is_hot)
        stats[chunk_name] = {
            'count': 0,
            'statuses': {},
            'db_path': db_path,
        }
    
    # Process all JSONL files
    total_processed = 0
    skipped = 0
    skip_reasons = {}
    
    jsonl_files = sorted(Path(jsonl_dir).glob('*.jsonl'))
    print(f'Found {len(jsonl_files)} JSONL files')
    print()
    
    for jsonl_file in jsonl_files:
        print(f'Processing {jsonl_file.name}...')
        
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    novel = json.loads(line)
                    
                    # Skip novels with invalid enum values (其他/下架)
                    skip_reason = should_skip_novel(novel)
                    if skip_reason:
                        skipped += 1
                        skip_reasons[skip_reason] = skip_reasons.get(skip_reason, 0) + 1
                        continue
                    
                    status = novel.get('status', '其他')
                    
                    # Get chunk category (pass author for cold split)
                    chunk_name = get_chunk_category(status, novel.get('author', ''))
                    
                    # Skip excluded data (should not happen after should_skip_novel)
                    if chunk_name is None:
                        skipped += 1
                        continue
                    
                    # Insert into the appropriate chunk
                    insert_novel(connections[chunk_name], novel)
                    stats[chunk_name]['count'] += 1
                    stats[chunk_name]['statuses'][status] = stats[chunk_name]['statuses'].get(status, 0) + 1
                    total_processed += 1
                    
                except json.JSONDecodeError as e:
                    print(f'  Warning: Invalid JSON at line {line_num}: {e}')
                    continue
                except Exception as e:
                    print(f'  Warning: Error processing line {line_num}: {e}')
                    continue
    
    # Compute author stats for each chunk
    print()
    print('Computing author statistics for each chunk...')
    
    for chunk_name, conn in connections.items():
        cursor = conn.cursor()
        
        # Get all novels from this chunk
        cursor.execute('SELECT id, author, click_num, title FROM novels WHERE author IS NOT NULL')
        chunk_novels = cursor.fetchall()
        
        # Compute author stats for this chunk
        author_stats = {}  # name -> {top_novel_id, top_novel_clicks, top_novel_title}
        for novel_id, author, click_num, title in chunk_novels:
            if author not in author_stats:
                author_stats[author] = {
                    'top_novel_id': novel_id,
                    'top_novel_clicks': click_num or 0,
                    'top_novel_title': title,
                }
            author_stat = author_stats[author]
            if (click_num or 0) > author_stat['top_novel_clicks']:
                author_stat['top_novel_clicks'] = click_num or 0
                author_stat['top_novel_id'] = novel_id
                author_stat['top_novel_title'] = title
        
        # Clear existing authors
        cursor.execute('DELETE FROM authors')
        
        # Insert authors with stats for this chunk
        for author_name, author_stat in author_stats.items():
            cursor.execute('''
                INSERT INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks)
                VALUES (?, ?, ?, ?)
            ''', (
                author_name,
                author_stat['top_novel_id'],
                author_stat['top_novel_title'],
                author_stat['top_novel_clicks'],
            ))
        
        conn.commit()
        print(f'  {chunk_name}: {len(author_stats)} authors')
    
    # Commit and close connections
    for chunk_name, conn in connections.items():
        conn.commit()
        conn.close()
    
    return {
        'total_processed': total_processed,
        'skipped': skipped,
        'skip_reasons': skip_reasons,
        'stats': stats,
    }


def get_file_size_mb(filepath: str) -> float:
    """Get file size in MB."""
    return os.path.getsize(filepath) / (1024 * 1024)


def main():
    # Default paths
    jsonl_dir = '/home/interset/Desktop/novel_hub/release/dataset'
    output_dir = '/home/interset/Desktop/mobile/scripts/output'
    
    # Allow overriding from command line
    if len(sys.argv) > 1:
        jsonl_dir = sys.argv[1]
    if len(sys.argv) > 2:
        output_dir = sys.argv[2]
    
    print('Novel Hub Chunk Builder')
    print('=' * 60)
    print(f'Input: {jsonl_dir}')
    print(f'Output: {output_dir}')
    print()
    
    if not os.path.exists(jsonl_dir):
        print(f'Error: Input directory not found: {jsonl_dir}')
        sys.exit(1)
    
    # Process JSONL files
    result = process_jsonl_files(jsonl_dir, output_dir)
    
    # Print statistics
    print()
    print('=' * 60)
    print('CHUNKING RESULTS')
    print('=' * 60)
    print()
    print(f'Total processed: {result["total_processed"]:,}')
    print(f'Skipped: {result["skipped"]:,}')
    
    if result['skip_reasons']:
        print()
        print('Skip reasons:')
        for reason, count in sorted(result['skip_reasons'].items(), key=lambda x: -x[1]):
            print(f'  {reason}: {count:,}')
    
    print()
    
    total_size = 0
    for chunk_name, chunk_stats in result['stats'].items():
        db_path = chunk_stats['db_path']
        size_mb = get_file_size_mb(db_path)
        total_size += size_mb
        
        print(f'{chunk_name.upper()} CHUNK:')
        print(f'  Records: {chunk_stats["count"]:,}')
        print(f'  Size: {size_mb:.2f} MB')
        print(f'  Description: {CHUNKS[chunk_name]["description"]}')
        print(f'  Statuses:')
        for status, count in sorted(chunk_stats['statuses'].items(), key=lambda x: -x[1]):
            print(f'    {status}: {count:,}')
        print()
    
    print(f'Total size: {total_size:.2f} MB')
    print()
    
    print('Done!')


if __name__ == '__main__':
    main()
