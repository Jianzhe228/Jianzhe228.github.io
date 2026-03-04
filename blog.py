#!/usr/bin/env python3
"""博客文章管理工具 - 发布与删除文章"""

import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

try:
    import yaml
except ImportError:
    print("需要 PyYAML: pip install pyyaml")
    sys.exit(1)

POSTS_DIR = Path(__file__).parent / "source" / "_posts"


def get_existing_categories():
    """扫描所有文章，提取已有分类"""
    categories = set()
    for f in POSTS_DIR.glob("*.md"):
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        # 现有文章没有开头的 ---，直接以 title: 开头，以 --- 结束
        if text.startswith("---"):
            fm_start = 3
        else:
            fm_start = 0
        end = text.find("---", fm_start)
        if end == -1:
            continue
        try:
            meta = yaml.safe_load(text[fm_start:end])
        except Exception:
            continue
        if isinstance(meta, dict) and meta.get("categories"):
            categories.add(str(meta["categories"]))
    return sorted(categories)


def choose_category():
    """让用户从已有分类中选择或输入新分类"""
    cats = get_existing_categories()
    if cats:
        print("\n已有分类：")
        for i, c in enumerate(cats, 1):
            print(f"  {i}. {c}")
        print(f"  {len(cats) + 1}. [输入新分类]")
        choice = input("选择分类编号: ").strip()
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(cats):
                return cats[idx - 1]
    return input("输入分类名称: ").strip()


def read_content():
    """读取多行文章内容，空行+END 结束"""
    print("输入文章内容（空行后输入 END 结束）：")
    lines = []
    while True:
        line = input()
        if line.strip() == "END" and lines and lines[-1] == "":
            lines.pop()  # 移除最后的空行
            break
        lines.append(line)
    return "\n".join(lines)


def git_auto_push(title):
    """自动 git add、commit、push"""
    repo_dir = Path(__file__).parent
    try:
        subprocess.run(["git", "add", "."], cwd=repo_dir, check=True)
        subprocess.run(["git", "commit", "-m", title], cwd=repo_dir, check=True)
        subprocess.run(["git", "push"], cwd=repo_dir, check=True)
        print("已自动提交并推送到远程仓库")
    except subprocess.CalledProcessError as e:
        print(f"Git 操作失败: {e}")


def search_posts():
    """搜索并列出文章，返回匹配的文章列表"""
    keyword = input("\n搜索关键词（留空列出全部）: ").strip()
    posts = sorted(POSTS_DIR.glob("*.md"))
    if keyword:
        posts = [p for p in posts if keyword.lower() in p.stem.lower()]
    if not posts:
        print("没有匹配的文章")
        return []
    print()
    for i, p in enumerate(posts, 1):
        print(f"  {i}. {p.stem}")
    return posts


def publish():
    """发布新文章"""
    title = input("\n文章标题: ").strip()
    if not title:
        print("标题不能为空")
        return

    category = choose_category()
    if not category:
        print("分类不能为空")
        return

    tags_input = input("标签（逗号分隔，可留空）: ").strip()
    tags = [t.strip() for t in tags_input.split(",") if t.strip()] if tags_input else []

    content = read_content()

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    tags_str = "[" + ",".join(tags) + "]" if tags else ""

    post_path = POSTS_DIR / f"{title}.md"

    with open(post_path, "w", encoding="utf-8") as f:
        f.write(f"title: {title}\n")
        f.write(f"date: {now}\n")
        f.write(f"categories: {category}\n")
        if tags_str:
            f.write(f"tags: {tags_str}\n")
        f.write("---\n")
        f.write(content)
        if content and not content.endswith("\n"):
            f.write("\n")

    print(f"\n创建成功: {post_path}")
    git_auto_push(title)


def delete():
    """删除文章（移到回收站）"""
    posts = search_posts()
    if not posts:
        return

    choice = input("\n选择编号（0 取消）: ").strip()
    if not choice.isdigit() or int(choice) == 0:
        return

    idx = int(choice)
    if idx < 1 or idx > len(posts):
        print("无效编号")
        return

    target = posts[idx - 1]
    confirm = input(f"确认删除「{target.stem}」？(y/N): ").strip().lower()
    if confirm != "y":
        print("已取消")
        return

    try:
        subprocess.run(["trash-put", str(target)], check=True)
        print(f"已移到回收站: {target.name}")
        git_auto_push(target.stem)
    except FileNotFoundError:
        print("未找到 trash-put，请安装: sudo apt install trash-cli")
    except subprocess.CalledProcessError as e:
        print(f"删除失败: {e}")


def edit():
    """修改文章"""
    posts = search_posts()
    if not posts:
        return

    choice = input("\n选择编号（0 取消）: ").strip()
    if not choice.isdigit() or int(choice) == 0:
        return

    idx = int(choice)
    if idx < 1 or idx > len(posts):
        print("无效编号")
        return

    target = posts[idx - 1]
    editor = os.environ.get("EDITOR", "xdg-open")
    print(f"正在打开: {target.name}")
    subprocess.run([editor, str(target)])
    input("编辑完成后按回车提交...")
    git_auto_push(target.stem)


def main():
    while True:
        print("\n=== 博客文章管理 ===")
        print("1. 发布文章")
        print("2. 修改文章")
        print("3. 删除文章")
        print("4. 退出")

        choice = input("选择操作: ").strip()
        if choice == "1":
            publish()
        elif choice == "2":
            edit()
        elif choice == "3":
            delete()
        elif choice == "4":
            break
        else:
            print("无效选择")


if __name__ == "__main__":
    main()
