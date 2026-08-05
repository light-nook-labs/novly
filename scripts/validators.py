#!/usr/bin/env python3
"""
Shared validation utilities for Novel Hub data processing.

Provides validation for:
- Enum fields (skip "其他" and "下架")
- Tags (skip/flatten nested lists)
"""

from typing import Optional

# Enum mappings (index 1 = OTHER/fallback)
STATUS_MAP = {
    '其他': 1,
    '已完结': 2,
    '连载中': 3,
    '断更': 4,
    '断更A': 5,
    '完结A': 6,
    '下架': 7,
}

GENRE_MAP = {
    '其他': 1,
    '魔幻': 2,
    '玄幻': 3,
    '古风': 4,
    '科幻': 5,
    '校园': 6,
    '都市': 7,
    '游戏': 8,
    '同人': 9,
    '悬疑': 10,
}

PTYPE_MAP = {
    '其他': 1,
    '免费': 2,
    '签约': 3,
    'VIP': 4,
}

# Values to skip
SKIP_STATUSES = {'其他', '下架'}
SKIP_GENRES = {'其他'}
SKIP_PTYPES = {'其他'}


def should_skip_novel(novel: dict) -> Optional[str]:
    """Check if a novel should be skipped based on enum fields.
    
    Returns:
        None if novel is valid, or reason string if should be skipped
    """
    status = novel.get('status', '其他')
    genre = novel.get('genre', '其他')
    ptype = novel.get('ptype', '其他')
    
    if status in SKIP_STATUSES:
        return f'status={status}'
    if genre in SKIP_GENRES:
        return f'genre={genre}'
    if ptype in SKIP_PTYPES:
        return f'ptype={ptype}'
    
    return None


def get_status_id(status: str) -> int:
    """Get status integer ID from string. Returns 1 (其他) for unknown."""
    return STATUS_MAP.get(status, 1)


def get_genre_id(genre: str) -> int:
    """Get genre integer ID from string. Returns 1 (其他) for unknown."""
    return GENRE_MAP.get(genre, 1)


def get_ptype_id(ptype: str) -> int:
    """Get ptype integer ID from string. Returns 1 (其他) for unknown."""
    return PTYPE_MAP.get(ptype, 1)


def normalize_tags(tags) -> list[str]:
    """Normalize tags, skipping non-string items and malformed strings.
    
    Only keeps valid string items, skips:
    - Nested lists
    - Strings that are JSON arrays like '["tag1", "tag2"]'
    
    Returns:
        List of tag strings
    """
    if not tags:
        return []
    
    if not isinstance(tags, list):
        return []
    
    result = []
    for item in tags:
        if isinstance(item, str):
            # Skip strings that look like JSON arrays
            if item.startswith('[') and item.endswith(']'):
                continue
            result.append(item)
    return result


def validate_tags(tags) -> tuple[list[str], bool]:
    """Validate and normalize tags.
    
    Returns:
        Tuple of (normalized_tags, had_nested_list)
    """
    if not tags:
        return [], False
    
    if not isinstance(tags, list):
        return [], False
    
    # Check if it's a nested list
    has_nested = any(isinstance(item, list) for item in tags)
    
    normalized = normalize_tags(tags)
    return normalized, has_nested
