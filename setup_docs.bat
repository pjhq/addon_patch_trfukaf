@echo off
setlocal

where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or is not on PATH.
    exit /b 1
)

set "DOCS_DIR=%~dp0docs"
if not exist "%DOCS_DIR%\" (
    mkdir "%DOCS_DIR%"
    if errorlevel 1 exit /b 1
)

set "FAILED=0"
call :setup_repo CBA_A3 https://github.com/CBATeam/CBA_A3.git
if errorlevel 1 set "FAILED=1"
call :setup_repo ACE3 https://github.com/acemod/ACE3.git
if errorlevel 1 set "FAILED=1"
call :setup_repo arma3-wiki https://github.com/acemod/arma3-wiki.git dist
if errorlevel 1 set "FAILED=1"

if "%FAILED%"=="1" (
    echo ERROR: One or more documentation repositories could not be set up.
    exit /b 1
)
echo Documentation repositories are up to date.
exit /b 0

:setup_repo
set "REPO_DIR=%DOCS_DIR%\%~1"
echo.
echo Setting up %~1...
if not exist "%REPO_DIR%\" (
    if "%~3"=="" (
        git clone "%~2" "%REPO_DIR%"
    ) else (
        git clone --branch "%~3" "%~2" "%REPO_DIR%"
    )
    if errorlevel 1 exit /b 1
    exit /b 0
)

if not exist "%REPO_DIR%\.git" (
    echo ERROR: "%REPO_DIR%" exists but is not a Git clone.
    exit /b 1
)

rem Fetch and reset instead of merging: discard local commits and file changes.
if not "%~3"=="" goto :update_branch
git -C "%REPO_DIR%" fetch --prune origin
if errorlevel 1 exit /b 1
git -C "%REPO_DIR%" reset --hard "@{upstream}"
if errorlevel 1 exit /b 1
rem Remove untracked and ignored files so the checkout is clean.
git -C "%REPO_DIR%" clean -fdx
if errorlevel 1 exit /b 1
exit /b 0

:update_branch
rem Fetch explicitly so this also works with an existing single-branch clone.
git -C "%REPO_DIR%" fetch origin "+refs/heads/%~3:refs/remotes/origin/%~3"
if errorlevel 1 exit /b 1
git -C "%REPO_DIR%" reset --hard
if errorlevel 1 exit /b 1
git -C "%REPO_DIR%" clean -fdx
if errorlevel 1 exit /b 1
git -C "%REPO_DIR%" checkout -f -B "%~3" "origin/%~3"
if errorlevel 1 exit /b 1
git -C "%REPO_DIR%" branch --set-upstream-to="origin/%~3" "%~3"
if errorlevel 1 exit /b 1
exit /b 0
