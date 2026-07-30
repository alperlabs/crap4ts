export const USAGE = `Usage: crap4ts [selection] [options]

Selection (mutually exclusive):
  (no args)                    Analyze all TypeScript files under the source roots
  --changed                    Analyze files with uncommitted changes (git status)
  --changed-since <ref>        Analyze files changed since merge-base with <ref>
                               (committed and uncommitted), e.g. origin/main
  <path...>                    Analyze these files; directory arguments are
                               searched under their own source roots

Options:
  --threshold <score>          Maximum allowed CRAP score (default: 8.0)
  --format <name>              Report format: text, json, or github (default: text)
  --no-coverage                Skip coverage; coverage and CRAP report as N/A
  --coverage-file <path>       Read an existing coverage report instead of
                               running the coverage command
  --coverage-command <command> Command that generates coverage (default: npm test)
  --coverage-format <name>     Coverage report format: istanbul or lcov
                               (default: detect from the report file name)
  --source-root <dir>          Source directory to search; repeatable
                               (default: src)
  --baseline <path>            Fail only on methods that are new or worse than
                               this baseline file
  --write-baseline             Write the baseline file from this run and exit 0
  --config <path>              Config file (default: crap4ts.config.json, then
                               the "crap4ts" key in package.json)
  --version                    Print the crap4ts version
  --help                       Print this help message

Exit codes: 0 success, 1 usage or execution error, 2 CRAP gate failed.
`;
