import os
import random
import subprocess
from datetime import datetime, timedelta

def get_positive_int(prompt, default=20):
    while True:
        try:
            user_input = input(f"{prompt} (default {default}): ")
            if not user_input.strip():
                return default
            value = int(user_input)
            if value > 0:
                return value
            else:
                print("Please enter a positive integer.")
        except ValueError:
            print("Invalid input. Please enter a valid integer.")

def get_repo_path(prompt, default="."):
    while True:
        user_input = input(f"{prompt} (default current directory): ")
        if not user_input.strip():
            return default
        if os.path.isdir(user_input):
            return user_input
        else:
            print("Directory does not exist. Please enter a valid path.")

def get_filename(prompt, default="data.txt"):
    user_input = input(f"{prompt} (default {default}): ")
    if not user_input.strip():
        return default
    return user_input

def random_date_in_last_year():
    today = datetime.now()
    start_date = today - timedelta(days=365)
    random_days = random.randint(0, 364)
    random_seconds = random.randint(0, 23*3600 + 3599)
    commit_date = start_date + timedelta(days=random_days, seconds=random_seconds)
    return commit_date

def make_commit(date, repo_path, filename, message="graph-greener!"):
    filepath = os.path.join(repo_path, filename)
    with open(filepath, "a") as f:
        f.write(f"Commit at {date.isoformat()}\n")
    subprocess.run(["git", "add", filename], cwd=repo_path)
    env = os.environ.copy()
    date_str = date.strftime("%Y-%m-%dT%H:%M:%S")
    env["GIT_AUTHOR_DATE"] = date_str
    env["GIT_COMMITTER_DATE"] = date_str
    subprocess.run(["git", "commit", "-m", message], cwd=repo_path, env=env)

def main():
    print("="*60)
    print("🌱 Welcome to graph-greener - GitHub Contribution Graph Commit Generator 🌱")
    print("="*60)
    print("This tool will help you fill your GitHub contribution graph with custom commits.\n")

    num_commits = get_positive_int("How many commits do you want to make", 20)
    repo_path = get_repo_path("Enter the path to your local git repository", ".")
    filename = get_filename("Enter the filename to modify for commits", "data.txt")

    print(f"\nMaking {num_commits} commits in repo: {repo_path}\nModifying file: {filename}\n")

    for i in range(num_commits):
        commit_date = random_date_in_last_year()
        print(f"[{i+1}/{num_commits}] Committing at {commit_date.strftime('%Y-%m-%d %H:%M:%S')}")
        make_commit(commit_date, repo_path, filename)

    print("\nPushing commits to your remote repository...")
    subprocess.run(["git", "push"], cwd=repo_path)
    print("✅ All done! Check your GitHub contribution graph in a few minutes.\n")
    print("Tip: Use a dedicated repository for best results. Happy coding!")

if __name__ == "__main__":
    main()
# ui-improvement backfill 2026-01-01 11:01:00
# ui-improvement backfill 2026-01-01 11:02:00
# ui-improvement backfill 2026-01-01 11:03:00
# ui-improvement backfill 2026-01-02 11:01:00
# ui-improvement backfill 2026-01-02 11:02:00
# ui-improvement backfill 2026-01-02 11:03:00
# ui-improvement backfill 2026-01-03 11:01:00
# ui-improvement backfill 2026-01-03 11:02:00
# ui-improvement backfill 2026-01-03 11:03:00
# ui-improvement backfill 2026-01-04 11:01:00
# ui-improvement backfill 2026-01-04 11:02:00
# ui-improvement backfill 2026-01-04 11:03:00
# ui-improvement backfill 2026-01-05 11:01:00
# ui-improvement backfill 2026-01-05 11:02:00
# ui-improvement backfill 2026-01-05 11:03:00
# ui-improvement backfill 2026-01-06 11:01:00
# ui-improvement backfill 2026-01-06 11:02:00
# ui-improvement backfill 2026-01-06 11:03:00
# ui-improvement backfill 2026-01-07 11:01:00
# ui-improvement backfill 2026-01-07 11:02:00
# ui-improvement backfill 2026-01-07 11:03:00
# ui-improvement backfill 2026-01-08 11:01:00
# ui-improvement backfill 2026-01-08 11:02:00
# ui-improvement backfill 2026-01-08 11:03:00
# ui-improvement backfill 2026-01-09 11:01:00
# ui-improvement backfill 2026-01-09 11:02:00
# ui-improvement backfill 2026-01-09 11:03:00
# ui-improvement backfill 2026-01-10 11:01:00
# ui-improvement backfill 2026-01-10 11:02:00
# ui-improvement backfill 2026-01-10 11:03:00
# ui-improvement backfill 2026-01-11 11:01:00
# ui-improvement backfill 2026-01-11 11:02:00
# ui-improvement backfill 2026-01-11 11:03:00
# ui-improvement backfill 2026-01-12 11:01:00
# ui-improvement backfill 2026-01-12 11:02:00
# ui-improvement backfill 2026-01-12 11:03:00
# ui-improvement backfill 2026-01-13 11:01:00
# ui-improvement backfill 2026-01-13 11:02:00
# ui-improvement backfill 2026-01-13 11:03:00
# ui-improvement backfill 2026-01-14 11:01:00
# ui-improvement backfill 2026-01-14 11:02:00
# ui-improvement backfill 2026-01-14 11:03:00
# ui-improvement backfill 2026-01-15 11:01:00
# ui-improvement backfill 2026-01-15 11:02:00
# ui-improvement backfill 2026-01-15 11:03:00
# ui-improvement backfill 2026-01-16 11:01:00
# ui-improvement backfill 2026-01-16 11:02:00
# ui-improvement backfill 2026-01-16 11:03:00
# ui-improvement backfill 2026-01-17 11:01:00
# ui-improvement backfill 2026-01-17 11:02:00
# ui-improvement backfill 2026-01-17 11:03:00
# ui-improvement backfill 2026-01-18 11:01:00
# ui-improvement backfill 2026-01-18 11:02:00
# ui-improvement backfill 2026-01-18 11:03:00
# ui-improvement backfill 2026-01-19 11:01:00
# ui-improvement backfill 2026-01-19 11:02:00
# ui-improvement backfill 2026-01-19 11:03:00
# ui-improvement backfill 2026-01-20 11:01:00
# ui-improvement backfill 2026-01-20 11:02:00
# ui-improvement backfill 2026-01-20 11:03:00
# ui-improvement backfill 2026-01-21 11:01:00
# ui-improvement backfill 2026-01-21 11:02:00
# ui-improvement backfill 2026-01-21 11:03:00
# ui-improvement backfill 2026-01-22 11:01:00
# ui-improvement backfill 2026-01-22 11:02:00
# ui-improvement backfill 2026-01-22 11:03:00
# ui-improvement backfill 2026-01-23 11:01:00
# ui-improvement backfill 2026-01-23 11:02:00
# ui-improvement backfill 2026-01-23 11:03:00
# ui-improvement backfill 2026-01-24 11:01:00
# ui-improvement backfill 2026-01-24 11:02:00
# ui-improvement backfill 2026-01-24 11:03:00
# ui-improvement backfill 2026-01-25 11:01:00
# ui-improvement backfill 2026-01-25 11:02:00
# ui-improvement backfill 2026-01-25 11:03:00
# ui-improvement backfill 2026-01-26 11:01:00
# ui-improvement backfill 2026-01-26 11:02:00
# ui-improvement backfill 2026-01-26 11:03:00
# ui-improvement backfill 2026-01-27 11:01:00
# ui-improvement backfill 2026-01-27 11:02:00
# ui-improvement backfill 2026-01-27 11:03:00
# ui-improvement backfill 2026-01-28 11:01:00
# ui-improvement backfill 2026-01-28 11:02:00
# ui-improvement backfill 2026-01-28 11:03:00
# ui-improvement backfill 2026-01-29 11:01:00
# ui-improvement backfill 2026-01-29 11:02:00
# ui-improvement backfill 2026-01-29 11:03:00
# ui-improvement backfill 2026-01-30 11:01:00
# ui-improvement backfill 2026-01-30 11:02:00
# ui-improvement backfill 2026-01-30 11:03:00
# ui-improvement backfill 2026-01-31 11:01:00
# ui-improvement backfill 2026-01-31 11:02:00
# ui-improvement backfill 2026-01-31 11:03:00
# ui-improvement backfill 2026-02-01 11:01:00
# ui-improvement backfill 2026-02-01 11:02:00
# ui-improvement backfill 2026-02-01 11:03:00
# ui-improvement backfill 2026-02-02 11:01:00
# ui-improvement backfill 2026-02-02 11:02:00
# ui-improvement backfill 2026-02-02 11:03:00
# ui-improvement backfill 2026-02-03 11:01:00
# ui-improvement backfill 2026-02-03 11:02:00
# ui-improvement backfill 2026-02-03 11:03:00
# ui-improvement backfill 2026-02-04 11:01:00
# ui-improvement backfill 2026-02-04 11:02:00
# ui-improvement backfill 2026-02-04 11:03:00
# ui-improvement backfill 2026-02-05 11:01:00
# ui-improvement backfill 2026-02-05 11:02:00
# ui-improvement backfill 2026-02-05 11:03:00
# ui-improvement backfill 2026-02-06 11:01:00
# ui-improvement backfill 2026-02-06 11:02:00
# ui-improvement backfill 2026-02-06 11:03:00
# ui-improvement backfill 2026-02-07 11:01:00
# ui-improvement backfill 2026-02-07 11:02:00
# ui-improvement backfill 2026-02-07 11:03:00
# ui-improvement backfill 2026-02-08 11:01:00
# ui-improvement backfill 2026-02-08 11:02:00
# ui-improvement backfill 2026-02-08 11:03:00
# ui-improvement backfill 2026-02-09 11:01:00
# ui-improvement backfill 2026-02-09 11:02:00
# ui-improvement backfill 2026-02-09 11:03:00
# ui-improvement backfill 2026-02-10 11:01:00
# ui-improvement backfill 2026-02-10 11:02:00
# ui-improvement backfill 2026-02-10 11:03:00
# ui-improvement backfill 2026-02-11 11:01:00
# ui-improvement backfill 2026-02-11 11:02:00
# ui-improvement backfill 2026-02-11 11:03:00
# ui-improvement backfill 2026-02-12 11:01:00
# ui-improvement backfill 2026-02-12 11:02:00
# ui-improvement backfill 2026-02-12 11:03:00
# ui-improvement backfill 2026-02-13 11:01:00
# ui-improvement backfill 2026-02-13 11:02:00
# ui-improvement backfill 2026-02-13 11:03:00
# ui-improvement backfill 2026-02-14 11:01:00
# ui-improvement backfill 2026-02-14 11:02:00
# ui-improvement backfill 2026-02-14 11:03:00
# ui-improvement backfill 2026-02-15 11:01:00
# ui-improvement backfill 2026-02-15 11:02:00
# ui-improvement backfill 2026-02-15 11:03:00
# ui-improvement backfill 2026-02-16 11:01:00
# ui-improvement backfill 2026-02-16 11:02:00
# ui-improvement backfill 2026-02-16 11:03:00
# ui-improvement backfill 2026-02-17 11:01:00
# ui-improvement backfill 2026-02-17 11:02:00
# ui-improvement backfill 2026-02-17 11:03:00
# ui-improvement backfill 2026-02-18 11:01:00
# ui-improvement backfill 2026-02-18 11:02:00
# ui-improvement backfill 2026-02-18 11:03:00
# ui-improvement backfill 2026-02-19 11:01:00
# ui-improvement backfill 2026-02-19 11:02:00
# ui-improvement backfill 2026-02-19 11:03:00
# ui-improvement backfill 2026-02-20 11:01:00
# ui-improvement backfill 2026-02-20 11:02:00
# ui-improvement backfill 2026-02-20 11:03:00
# ui-improvement backfill 2026-02-21 11:01:00
# ui-improvement backfill 2026-02-21 11:02:00
# ui-improvement backfill 2026-02-21 11:03:00
# ui-improvement backfill 2026-02-22 11:01:00
# ui-improvement backfill 2026-02-22 11:02:00
# ui-improvement backfill 2026-02-22 11:03:00
# ui-improvement backfill 2026-02-23 11:01:00
# ui-improvement backfill 2026-02-23 11:02:00
# ui-improvement backfill 2026-02-23 11:03:00
# ui-improvement backfill 2026-02-24 11:01:00
# ui-improvement backfill 2026-02-24 11:02:00
# ui-improvement backfill 2026-02-24 11:03:00
# ui-improvement backfill 2026-02-25 11:01:00
# ui-improvement backfill 2026-02-25 11:02:00
# ui-improvement backfill 2026-02-25 11:03:00
# ui-improvement backfill 2026-02-26 11:01:00
# ui-improvement backfill 2026-02-26 11:02:00
# ui-improvement backfill 2026-02-26 11:03:00
# ui-improvement backfill 2026-02-27 11:01:00
# ui-improvement backfill 2026-02-27 11:02:00
# ui-improvement backfill 2026-02-27 11:03:00
# ui-improvement backfill 2026-02-28 11:01:00
# ui-improvement backfill 2026-02-28 11:02:00
# ui-improvement backfill 2026-02-28 11:03:00
# ui-improvement backfill 2026-03-01 11:01:00
# ui-improvement backfill 2026-03-01 11:02:00
# ui-improvement backfill 2026-03-01 11:03:00
# ui-improvement backfill 2026-03-02 11:01:00
# ui-improvement backfill 2026-03-02 11:02:00
# ui-improvement backfill 2026-03-02 11:03:00
# ui-improvement backfill 2026-03-03 11:01:00
# ui-improvement backfill 2026-03-03 11:02:00
# ui-improvement backfill 2026-03-03 11:03:00
# ui-improvement backfill 2026-03-04 11:01:00
# ui-improvement backfill 2026-03-04 11:02:00
# ui-improvement backfill 2026-03-04 11:03:00
# ui-improvement backfill 2026-03-05 11:01:00
# ui-improvement backfill 2026-03-05 11:02:00
# ui-improvement backfill 2026-03-05 11:03:00
# ui-improvement backfill 2026-03-06 11:01:00
# ui-improvement backfill 2026-03-06 11:02:00
# ui-improvement backfill 2026-03-06 11:03:00
# ui-improvement backfill 2026-03-07 11:01:00
# ui-improvement backfill 2026-03-07 11:02:00
# ui-improvement backfill 2026-03-07 11:03:00
# ui-improvement backfill 2026-03-08 11:01:00
# ui-improvement backfill 2026-03-08 11:02:00
# ui-improvement backfill 2026-03-08 11:03:00
# ui-improvement backfill 2026-03-09 11:01:00
# ui-improvement backfill 2026-03-09 11:02:00
# ui-improvement backfill 2026-03-09 11:03:00
# ui-improvement backfill 2026-03-10 11:01:00
# ui-improvement backfill 2026-03-10 11:02:00
# ui-improvement backfill 2026-03-10 11:03:00
# ui-improvement backfill 2026-03-11 11:01:00
# ui-improvement backfill 2026-03-11 11:02:00
# ui-improvement backfill 2026-03-11 11:03:00
# ui-improvement backfill 2026-03-12 11:01:00
# ui-improvement backfill 2026-03-12 11:02:00
# ui-improvement backfill 2026-03-12 11:03:00
# ui-improvement backfill 2026-03-13 11:01:00
# ui-improvement backfill 2026-03-13 11:02:00
# ui-improvement backfill 2026-03-13 11:03:00
# ui-improvement backfill 2026-03-14 11:01:00
# ui-improvement backfill 2026-03-14 11:02:00
# ui-improvement backfill 2026-03-14 11:03:00
# ui-improvement backfill 2026-03-15 11:01:00
# ui-improvement backfill 2026-03-15 11:02:00
