title: vscode settings.json备份
date: 2025-03-09 02:12:00
categories: 搞七捻三
tags: [vscode]
---
{
    "editor.fontFamily": "'JetBrains Mono', Consolas, 'Courier New', monospace",
    "editor.fontSize": 16,
    "workbench.colorTheme": "JetBrains Darcula Theme",
    "workbench.iconTheme": "vscode-jetbrains-icon-theme",
    "remote.SSH.remotePlatform": {
        "13.250.32.58": "linux",
        "43.163.110.165": "linux"
    },
    "cmake.showOptionsMovedNotification": false,
    "cmake.pinnedCommands": [
        "workbench.action.tasks.configureTaskRunner",
        "workbench.action.tasks.runTask"
    ],
    "files.autoSave": "afterDelay",
    "github.copilot.enable": {
        "*": false,
        "plaintext": false,
        "markdown": false,
        "scminput": false
    },
    "update.mode": "start",
    "redhat.telemetry.enabled": false,
    "cmake.showConfigureWithDebuggerNotification": false,
    // 解决cmake输出中文乱码问题
    "files.encoding": "utf8",
    "cmake.outputLogEncoding": "UTF-8",
    //解决终端乱码问题
    // "terminal.integrated.profiles.windows": {
    //     "PowerShell": {
    //         "source": "PowerShell",
    //         "args": [
    //             "-NoExit",
    //             "-Command",
    //             "chcp 65001"
    //         ]
    //     },
    //     "Command Prompt": {
    //         "path": "C:\\Windows\\System32\\cmd.exe",
    //         "args": [
    //             "/K",
    //             "chcp 65001"
    //         ]
    //     }
    // },
    "terminal.integrated.defaultProfile.windows": "PowerShell", //默认打开终端为PowerShell
    "clangd.detectExtensionConflicts": false,
    "git.openRepositoryInParentFolders": "always",
    "security.workspace.trust.enabled": false,
    "security.workspace.trust.emptyWindow": false,
    "[cpp]": {
        "editor.defaultFormatter": "xaver.clang-format"
    },
    "clang-format.executable": "D:/clang-format/clang-format.exe",
    "clang-format.fallbackStyle": "None",
    "clang-format.language.apex.fallbackStyle": "None",
    "clang-format.language.apex.style": "None",
    "clangd.path": "D:/clangd_18.1.3/bin/clangd.exe",
    "editor.quickSuggestionsDelay": 0,
    "workbench.startupEditor": "none",
    "explorer.autoReveal": false,
    "editor.cursorStyle": "block",
    "C_Cpp.intelliSenseEngine": "disabled",
    "C_Cpp.codeAnalysis.runAutomatically": true,
    "C_Cpp.configurationWarnings": "disabled",
    "C_Cpp.codeFolding": "disabled",
    "C_Cpp.formatting": "clangFormat",
    "C_Cpp.codeAnalysis.clangTidy.enabled": true,
    "C_Cpp.autocomplete": "default",
    "C_Cpp.default.cppStandard": "c++17",
    "C_Cpp.default.cStandard": "c17",
    "C_Cpp.enhancedColorization": "enabled",
    "C_Cpp.codeAnalysis.clangTidy.useBuildPath": true,
    "C_Cpp.default.compileCommands": "${workspaceFolder}/build/compile_commands.json",
    "C_Cpp.codeAnalysis.clangTidy.config": "${workspaceFolder}/.clang-tidy",
    //todo-tree
    "todo-tree.highlights.defaultHighlight": {
        "icon": "alert",
        "type": "tag",
        "background": "#e8cd37", // 高亮背景颜色
        "color": "#000000", // 字体颜色
        "fontWeight": "bold"
    },
    "todo-tree.regex.regex": "(TODO|FIXME|NOTE)", // 正则表达式，用于匹配关键字
    "todo-tree.general.tags": [
        "TODO",
        "FIXME",
        "NOTE"
    ], // 自定义标签
    "todo-tree.highlights.customHighlight": {
        "TODO": {
            "icon": "check",
            "background": "#e65a30",
            "color": "#FFFFFF",
            "fontWeight": "bold"
        },
        "FIXME": {
            "icon": "bug",
            "background": "#ed2e6e",
            "color": "#FFFFFF",
            "fontWeight": "bold"
        },
        "NOTE": {
            "icon": "info",
            "background": "#2596f2",
            "color": "#FFFFFF",
            "fontWeight": "bold"
        }
    },
    "todo-tree.tree.autoRefresh": true, // 自动刷新
    "todo-tree.general.rootFolder": "${workspaceFolder}",
    "todo-tree.filtering.includeGlobs": [
        "**/*" // Include only files in the current workspace
    ],
    "todo-tree.filtering.excludeGlobs": [
        "**/build/**",
        "**/bin/**",
        "**/.cache/**",
        "**/.vscode/**",
        "**/.git/**",
    ],
    "todo-tree.tree.scanMode": "workspace",
    "git.enableSmartCommit": true,
    "editor.unicodeHighlight.invisibleCharacters": false,
    "editor.unicodeHighlight.ambiguousCharacters": false,
    "makefile.configureOnOpen": false,
    "[c]": {
        "editor.defaultFormatter": "llvm-vs-code-extensions.vscode-clangd"
    },
    "[javascript]": {
        "editor.defaultFormatter": "vscode.typescript-language-features"
    },
    "[proto3]": {
        "editor.defaultFormatter": "zxh404.vscode-proto3"
    },
    "workbench.editor.limit.enabled": true,
    "workbench.editor.limit.value": 8,
    "workbench.tree.renderIndentGuides": "always",
    "workbench.tree.expandMode": "doubleClick",
    "window.commandCenter": false,
    "java.configuration.maven.userSettings": "D:/apache-maven-3.9.9/conf/settings.xml", 
    "maven.executable.path": "D:/apache-maven-3.9.9/bin/mvn",// Maven可执行文件的完整路径
    "maven.terminal.useJavaHome": true, // 使用JAVA_HOME环境变量中的JDK
    "maven.view": "flat", // 可选，设置Maven依赖视图样式
    "java.maven.downloadSources": true,// 自动下载源代码
    "[java]": {
        "editor.defaultFormatter": "redhat.java"
    },
    "github.copilot.selectedCompletionModel": "gpt-4o-copilot",
    "cmake.automaticReconfigure": false,
    "cmake.configureOnEdit": false
}