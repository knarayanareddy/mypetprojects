#!/usr/bin/env python3
"""Install the Demand Radar skill into Hermes Agent, Roo Code, Claude Code, Codex / any Agent Skills host,
or a folder of your choice. Standard library only, no network. Safe by default: it never overwrites
without --force and never edits an existing file you own (existing .roomodes / AGENTS.md are only
appended to between clearly marked lines, or left alone with instructions).

Examples:
  python3 install.py --target hermes                      # ~/.hermes/skills/research/demand-radar
  python3 install.py --target roo --dest ~/code/myproj    # <proj>/.roo/{skills,commands,rules-*} + .roomodes
  python3 install.py --target roo --scope global          # ~/.roo/...
  python3 install.py --target agents                      # ~/.agents/skills/demand-radar (shared by many agents)
  python3 install.py --target claude --scope project      # ./.claude/skills/demand-radar
  python3 install.py --target path --dest ./vendor/skills # ./vendor/skills/demand-radar
  python3 install.py --target all --dry-run               # show what every target would do
  python3 install.py --target hermes --uninstall

Add --with-agents-md to also append a short Demand Radar section to <dest>/AGENTS.md so any
AGENTS.md-aware agent (Roo Code, Codex, Cursor, Aider, Hermes, ...) knows the skill exists.
"""
import argparse
import os
import shutil
import sys

KIT = os.path.dirname(os.path.abspath(__file__))
SKILL_SRC = os.path.join(KIT, "skills", "demand-radar")
ROO_SRC = os.path.join(KIT, "adapters", "roo-code")
AGENTS_SNIPPET = os.path.join(KIT, "adapters", "generic", "AGENTS.snippet.md")
NAME = "demand-radar"
MARK_BEGIN, MARK_END = "<!-- demand-radar:begin -->", "<!-- demand-radar:end -->"
IGNORE = shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store")

DRY = False


def say(msg):
    print(("[dry-run] " if DRY else "") + msg)


def home(*p):
    return os.path.join(os.path.expanduser("~"), *p)


def copy_tree(src, dst, force, symlink=False):
    if os.path.lexists(dst):
        if not force:
            say(f"skip (exists, use --force to replace): {dst}")
            return False
        say(f"replace: {dst}")
        if not DRY:
            if os.path.islink(dst) or os.path.isfile(dst):
                os.remove(dst)
            else:
                shutil.rmtree(dst)
    say(f"{'link' if symlink else 'copy'}: {src} -> {dst}")
    if not DRY:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if symlink:
            os.symlink(src, dst, target_is_directory=True)
        else:
            shutil.copytree(src, dst, ignore=IGNORE)
    return True


def copy_file(src, dst, force):
    if os.path.exists(dst) and not force:
        say(f"skip (exists, use --force to replace): {dst}")
        return False
    say(f"copy: {src} -> {dst}")
    if not DRY:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
    return True


def remove(path):
    if os.path.lexists(path):
        say(f"remove: {path}")
        if not DRY:
            if os.path.islink(path) or os.path.isfile(path):
                os.remove(path)
            else:
                shutil.rmtree(path)
    else:
        say(f"not installed: {path}")


def append_agents_md(dest, uninstall=False):
    path = os.path.join(dest, "AGENTS.md")
    block = open(AGENTS_SNIPPET, encoding="utf-8").read().strip()
    text = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    has = MARK_BEGIN in text
    if uninstall:
        if has:
            a, b = text.index(MARK_BEGIN), text.index(MARK_END) + len(MARK_END)
            say(f"remove Demand Radar section from {path}")
            if not DRY:
                open(path, "w", encoding="utf-8").write((text[:a].rstrip() + "\n" + text[b:].lstrip()).strip() + "\n")
        return
    if has:
        say(f"AGENTS.md already has a Demand Radar section: {path}")
        return
    say(f"append Demand Radar section to {path}")
    if not DRY:
        sep = "\n\n" if text.strip() else ""
        open(path, "w", encoding="utf-8").write(text.rstrip() + sep + f"{MARK_BEGIN}\n{block}\n{MARK_END}\n")


def roo_install(scope, dest, force, symlink, uninstall):
    base = dest if scope == "project" else home()
    roo = os.path.join(base, ".roo")
    skill = os.path.join(roo, "skills", NAME)
    cmd = os.path.join(roo, "commands", "demand.md")
    rules = os.path.join(roo, f"rules-{NAME}")
    if uninstall:
        for p in (skill, cmd, rules):
            remove(p)
        if scope == "project":
            print("  .roomodes is not touched on uninstall; delete the demand-radar block yourself if you want it gone.")
        return
    copy_tree(SKILL_SRC, skill, force, symlink)
    copy_file(os.path.join(ROO_SRC, ".roo", "commands", "demand.md"), cmd, force)
    copy_tree(os.path.join(ROO_SRC, ".roo", f"rules-{NAME}"), rules, force)
    modes_src = os.path.join(ROO_SRC, ".roomodes")
    if scope == "project":
        target = os.path.join(base, ".roomodes")
        if not os.path.exists(target):
            copy_file(modes_src, target, force)
        elif f"slug: {NAME}" in open(target, encoding="utf-8").read():
            say(f".roomodes already defines the {NAME} mode: {target}")
        else:
            side = target + ".demand-radar"
            copy_file(modes_src, side, True)
            print(f"  You already have a .roomodes. Merge the mode block from {side} into it\n"
                  f"  (add it under customModes:), then delete the side file.")
    else:
        print("  Global modes live in Roo's custom_modes.yaml: open Modes -> Edit Global Modes and paste the mode\n"
              f"  block from {modes_src}. The skill, /demand command and mode rules were installed above.")


def install(target, args):
    scope = args.scope or ("global" if target in ("hermes",) else "project")
    dest = os.path.abspath(os.path.expanduser(args.dest or os.getcwd()))
    print(f"== {target} ({scope}) ==")
    if target == "hermes":
        cat = args.category
        path = home(".hermes", "skills", *( [cat] if cat else [] ), NAME)
        if args.uninstall:
            remove(path)
        else:
            copy_tree(SKILL_SRC, path, args.force, args.symlink)
            print("  Start a new Hermes session and check: hermes skills list   |   run: /demand-radar <idea>")
    elif target == "roo":
        roo_install(scope, dest, args.force, args.symlink, args.uninstall)
    elif target in ("agents", "codex"):
        path = os.path.join(dest if scope == "project" else home(), ".agents", "skills", NAME)
        remove(path) if args.uninstall else copy_tree(SKILL_SRC, path, args.force, args.symlink)
        if not args.uninstall:
            print("  Cross-agent location: read by Roo Code, Codex CLI and other Agent Skills hosts; Hermes via skills.external_dirs.")
    elif target == "claude":
        path = os.path.join(dest if scope == "project" else home(), ".claude", "skills", NAME)
        remove(path) if args.uninstall else copy_tree(SKILL_SRC, path, args.force, args.symlink)
        if not args.uninstall:
            print("  Claude Code: run /demand-radar <idea>  (or install the plugin: see README, 'Claude Code').")
    elif target == "path":
        if not args.dest:
            sys.exit("--target path needs --dest <folder>")
        path = os.path.join(dest, NAME)
        remove(path) if args.uninstall else copy_tree(SKILL_SRC, path, args.force, args.symlink)
    else:
        sys.exit(f"unknown target: {target}")
    if args.with_agents_md and target != "hermes":
        append_agents_md(dest if scope == "project" else dest, args.uninstall)


def main():
    global DRY
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--target", required=True, choices=["hermes", "roo", "claude", "codex", "agents", "path", "all"])
    ap.add_argument("--scope", choices=["global", "project"], default="",
                    help="default: global for hermes, project for the rest")
    ap.add_argument("--dest", default="", help="project folder (default: current directory) or install folder for --target path")
    ap.add_argument("--category", default="research", help="Hermes category folder ('' for none)")
    ap.add_argument("--force", action="store_true", help="replace an existing install")
    ap.add_argument("--symlink", action="store_true", help="link instead of copy (edits in this kit show up everywhere)")
    ap.add_argument("--with-agents-md", action="store_true", help="append a Demand Radar section to <dest>/AGENTS.md")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    DRY = args.dry_run
    if not os.path.isfile(os.path.join(SKILL_SRC, "SKILL.md")):
        sys.exit(f"cannot find the skill at {SKILL_SRC}; run install.py from the kit folder")
    targets = ["hermes", "roo", "agents", "claude"] if args.target == "all" else [args.target]
    for t in targets:
        install(t, args)
    print("done." if not DRY else "dry run only, nothing was changed.")


if __name__ == "__main__":
    main()
