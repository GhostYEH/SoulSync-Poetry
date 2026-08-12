@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    古诗词学习系统 - 打包脚本
echo ========================================
echo.

set "SOURCE_DIR=%~dp0"
set "RELEASE_DIR=%SOURCE_DIR%古诗词学习系统"

echo 源目录: %SOURCE_DIR%
echo 发布目录: %RELEASE_DIR%
echo.

echo [1/7] 清理并创建发布目录...
if exist "%RELEASE_DIR%" rd /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%"

echo [2/7] 复制绿色版Node.js...
xcopy "%SOURCE_DIR%nodejs" "%RELEASE_DIR%\nodejs\" /E /I /Y /Q
echo     完成!

echo [3/7] 复制后端代码...
mkdir "%RELEASE_DIR%\backend"
xcopy "%SOURCE_DIR%backend\src" "%RELEASE_DIR%\backend\src\" /E /I /Y /Q
xcopy "%SOURCE_DIR%backend\public" "%RELEASE_DIR%\backend\public\" /E /I /Y /Q
copy "%SOURCE_DIR%backend\server.js" "%RELEASE_DIR%\backend\" /Y >nul
copy "%SOURCE_DIR%backend\package.json" "%RELEASE_DIR%\backend\" /Y >nul
copy "%SOURCE_DIR%backend\package-lock.json" "%RELEASE_DIR%\backend\" /Y >nul 2>nul
echo     完成!

echo [4/7] 复制数据库文件...
if exist "%SOURCE_DIR%backend\db\poetry.db" (
    mkdir "%RELEASE_DIR%\backend\db"
    copy "%SOURCE_DIR%backend\db\poetry.db" "%RELEASE_DIR%\backend\db\" /Y
    echo     数据库已复制!
) else (
    mkdir "%RELEASE_DIR%\backend\db"
    echo     数据库将在首次启动时自动创建!
)

echo [5/7] 创建配置文件...
(
echo # 应用配置
echo PORT=3000
echo NODE_ENV=production
echo.
echo # JWT配置
echo JWT_SECRET=your-secret-key-change-this-in-production
echo.
echo # 数据库配置
echo DB_PATH=./db/poetry.db
echo.
echo # CORS配置
echo CORS_ORIGIN=*
echo.
echo # 日志配置
echo LOG_LEVEL=info
) > "%RELEASE_DIR%\backend\.env"
echo     完成!

echo [6/7] 安装后端依赖...
cd /d "%RELEASE_DIR%\backend"
"%RELEASE_DIR%\nodejs\npm.cmd" install --production --legacy-peer-deps
if errorlevel 1 (
    echo     警告: 依赖安装可能有问题，但将继续...
)
echo     完成!

echo [7/7] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo title 古诗词学习系统
echo.
echo echo ========================================
echo echo    古诗词学习系统
echo echo ========================================
echo echo.
echo.
echo cd /d "%%~dp0"
echo.
echo echo 正在启动服务器...
echo echo 访问地址: http://localhost:3000
echo echo.
echo echo 按 Ctrl+C 停止服务
echo echo ========================================
echo echo.
echo.
echo cd backend
echo "..\nodejs\node.exe" server.js
echo.
echo echo 服务已停止
echo pause
) > "%RELEASE_DIR%\start.bat"
echo     完成!

echo.
echo ========================================
echo    打包完成!
echo ========================================
echo.
echo 发布目录: %RELEASE_DIR%
echo.
echo 使用方法:
echo   1. 双击 start.bat 启动服务
echo   2. 浏览器访问 http://localhost:3000
echo.
pause
