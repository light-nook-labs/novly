# Regenerating Data Chunks (gzip files)

Data source: `interset-wq/nookdata` (corrected data from `light-nook-labs/novel_hub`).

**Source of truth**: `nookdata` release JSONL files → `scripts/build_chunks.py` → `assets/chunks/*.sqlite.gz`.

```bash
# 1. Get nookdata-fixed JSONL (from nookdata repo's temp/repaired/jsonl_fixed/)
#    Place them in a local directory, e.g. temp/nookdata-fixed/

# 2. Run build_chunks.py (from scripts/ directory)
cd scripts
python build_chunks.py <jsonl_dir> <output_dir>
# Example: python build_chunks.py ../temp/nookdata-fixed ../temp/output-chunks

# 3. Compress output to gzip and copy to assets/chunks/
node -e "
const fs=require('fs'),zlib=require('zlib');
const dir='<output_dir>';
for(const name of['hot','cold_1','cold_2','cold_3']){
  const raw=fs.readFileSync(dir+'/'+name+'_chunk.sqlite');
  const gz=zlib.gzipSync(raw,{level:9});
  fs.writeFileSync('../assets/chunks/'+name+'_chunk.sqlite.gz',gz);
  console.log(name+': raw='+(raw.length/1024/1024).toFixed(1)+'MB, gz='+(gz.length/1024/1024).toFixed(1)+'MB');
}
"
```

**Chunk categories** (defined in `scripts/build_chunks.py`):

| Chunk  | Status                                 | Records | Size (compressed) | Update Frequency |
| ------ | -------------------------------------- | ------- | ----------------- | ---------------- |
| hot    | 连载中, 完结A, 断更A                   | ~5k     | ~1.6MB            | Monthly          |
| cold_1 | 断更, 已完结 (author hash partition 0) | ~80k    | ~20MB             | Never            |
| cold_2 | 断更, 已完结 (author hash partition 1) | ~80k    | ~20MB             | Never            |
| cold_3 | 断更, 已完结 (author hash partition 2) | ~80k    | ~20MB             | Never            |

Cold data is split into3 parts by author name hash (`md5(author) % 3`), so novels by the same author always stay in the same chunk. This minimizes redundant author data across chunks.

下架 (7) and 其他 (1) data is excluded. Genre "其他" (1) is also excluded.

**Source dirs** (gitignored, for reference):

- `temp/nookdata-fixed/` — corrected JSONL from nookdata

> **`temp/` directory policy (hard rule)**: reserved ONLY for temporary files and cloning other repos (to avoid using the system temp directory). **NEVER put important code here.**
> Data pipeline scripts (`build_chunks.py`, `validators.py`, `fix_ptype.py`) must live in `scripts/` and be version-controlled — they were once gitignored under `temp/` and lost, recoverable only from the recycle bin.
