#!/usr/bin/env python3
"""修复 nookdata JSONL 的 ptype 字段(以 novel_hub 首个 pre-release 为基准)。

背景:novel_hub 从 v0.0.1(数字 ptype,正确)之后的版本,爬虫管线丢失/写错了 ptype,
nookdata 以名称字符串继承并出现污染(典型:大量 VIP 被标为 免费,例:小说 665678)。
JSONL 是 chunk 构建的源头,必须在源头修复,否则每次重建 chunk 错误都会传播。

用法:
  python fix_ptype.py <jsonl_dir> <v001_enum_csv> [--output <dir>]
  默认原地修改;--output 时写到新目录(不覆盖原文件)。

注意:原地修改时,先把文件完整读入内存再写回——绝不可对同一文件同时 open 读与写
(会先把文件截断为 0 字节,导致数据丢失)。
"""
import csv
import glob
import json
import os
import sys
import collections

# v0.0.1 CSV 中 ptype 为数字 id,映射回名称(与 validators.PTYPE_MAP 一致)
NAME_OF = {"2": "免费", "3": "签约", "4": "VIP"}


def load_v001(csv_path: str) -> dict:
    """读取 novel_hub v0.0.1 的 data_with_enum.csv,返回 nid -> 正确 ptype 名称。"""
    m = {}
    with open(csv_path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            nid = (row.get("nid") or "").strip()
            ptype = (row.get("ptype") or "").strip()
            if not nid or not ptype:
                continue
            try:
                m[int(nid)] = NAME_OF.get(ptype, ptype)
            except ValueError:
                continue
    return m


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    jsonl_dir, csv_path = sys.argv[1], sys.argv[2]
    out_dir = None
    if "--output" in sys.argv:
        out_dir = sys.argv[sys.argv.index("--output") + 1]
        os.makedirs(out_dir, exist_ok=True)

    correct = load_v001(csv_path)
    changed = collections.Counter()
    total_changed = 0

    for fp in sorted(glob.glob(os.path.join(jsonl_dir, "*.jsonl"))):
        # 安全:先完整读入内存(关闭读句柄),再统一写回
        with open(fp, encoding="utf-8") as fin:
            lines = fin.readlines()

        out_lines = []
        n = 0
        for line in lines:
            d = json.loads(line)
            want = correct.get(d.get("nid"))
            if want is not None and d.get("ptype") != want:
                changed[f"{d.get('ptype')} -> {want}"] += 1
                d["ptype"] = want
                # 仅重写发生变化的行,未变化的行原样保留(最小 diff)
                out_lines.append(json.dumps(d, ensure_ascii=False, separators=(",", ":")) + "\n")
                n += 1
            else:
                out_lines.append(line)

        fp_out = os.path.join(out_dir, os.path.basename(fp)) if out_dir else fp
        with open(fp_out, "w", encoding="utf-8") as fout:
            fout.writelines(out_lines)
        total_changed += n
        print(f"{os.path.basename(fp)}: 修正 {n} 条")

    print(f"共修正 {total_changed} 条:", dict(changed))


if __name__ == "__main__":
    main()
