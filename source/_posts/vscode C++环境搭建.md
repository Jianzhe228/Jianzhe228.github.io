title: vscode C++环境搭建
date: 2025-02-23 16:44:00
categories: 开发调优
tags: [C++,vscode]
---
## C++插件：

1. 快速生成类，快捷键：**Alt**+**X**

   ```bash
   C++ Class Creator
   ```
   
2. 代码格式化，快捷键：shift+alt+f

   ```bash
   Clang-Format
   ```
   
3. 使用clangd索引

   ```bash
   clangd
   ```
   
4. CMake Tools

6. 快速生成文档

   ```bash
   Doxygen Documentation Generator
   ```
   
6. Makefile Tools

7. C/C++ 用于配置clang-tidy,只使用其调试和clang-tidy功能，下面的settings配置默认关闭其自动生成函数定义功能

9. 快速生成if,for,switch,try等结构

   ```bash
   C/C++ Snippets
   ```
   
   
   
11. C/C++ Include Guard

## 其他插件：

1. JetBrains Darcula Theme:主题（推荐），电脑需要安装jetbrains字体， [JetBrains Mono 字体下载页面](https://www.jetbrains.com/lp/mono/)
2. JetBrains Icon Theme:图标（推荐）
3. JetBrains IDE Keymap（推荐）
4. Remote - SSH:远程连接（推荐）
5. Todo Tree ,设置TODO,NOTE等标签 (推荐)
6. GitHub Copilot

## 本地settings.json

其中一些软件地址需要自行修改，注意使用，防止与自己之前的配置冲突或覆盖

```json
{
    "editor.fontFamily": "'JetBrains Mono', Consolas, 'Courier New', monospace",
    "editor.fontSize": 16,
    "workbench.colorTheme": "JetBrains Darcula Theme",
    "workbench.iconTheme": "vscode-jetbrains-icon-theme",
    "cmake.pinnedCommands": [
        "workbench.action.tasks.configureTaskRunner",
        "workbench.action.tasks.runTask"
    ],
    "files.autoSave": "afterDelay",
    "github.copilot.enable": {
        "*": true,
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
    "C_Cpp.intelliSenseEngine": "disabled",//会跟clangd冲突，启用后代码提示会变慢，不开启的话无法使用自动生成函数定义功能
    "C_Cpp.codeAnalysis.runAutomatically": true,
    "C_Cpp.configurationWarnings": "disabled",
    "C_Cpp.codeFolding": "disabled",
    "C_Cpp.formatting": "clangFormat",
    "C_Cpp.codeAnalysis.clangTidy.enabled": true,
    "C_Cpp.autocomplete": "disabled",//应该是关闭代码补全提示，使用clangd即可
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
    "workbench.editor.limit.enabled": true,
    "workbench.editor.limit.value": 8,
    "workbench.tree.renderIndentGuides": "always",
    "workbench.tree.expandMode": "doubleClick",
    "window.commandCenter": false,
    "github.copilot.selectedCompletionModel": "gpt-4o-copilot",
    "editor.accessibilitySupport": "off",
}
```

## 远程settings.json

其中一些软件地址需要自行修改，注意使用，防止与自己之前的配置冲突或覆盖

```json
{
    "editor.fontFamily": "'JetBrains Mono', Consolas, 'Courier New', monospace",
    "editor.fontSize": 16,
    "workbench.colorTheme": "JetBrains Darcula Theme",
    "workbench.iconTheme": "vscode-jetbrains-icon-theme",
    "cmake.pinnedCommands": [
        "workbench.action.tasks.configureTaskRunner",
        "workbench.action.tasks.runTask"
    ],
    "files.autoSave": "afterDelay",
    "github.copilot.enable": {
        "*": true,
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
    "C_Cpp.intelliSenseEngine": "disabled",//会跟clangd冲突，启用后代码提示会变慢，不开启的话无法使用自动生成函数定义功能
    "C_Cpp.codeAnalysis.runAutomatically": true,
    "C_Cpp.configurationWarnings": "disabled",
    "C_Cpp.codeFolding": "disabled",
    "C_Cpp.formatting": "clangFormat",
    "C_Cpp.codeAnalysis.clangTidy.enabled": true,
    "C_Cpp.autocomplete": "disabled",
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
    "workbench.editor.limit.enabled": true,
    "workbench.editor.limit.value": 8,
    "workbench.tree.renderIndentGuides": "always",
    "workbench.tree.expandMode": "doubleClick",
    "window.commandCenter": false,
    "github.copilot.selectedCompletionModel": "gpt-4o-copilot",
}
```

## .clang-tidy

这是在网上找的clion默认的clang-tidy文件

```yaml
---
Checks: >
  clang-diagnostic-*,
  clang-analyzer-*,
  -*,
  bugprone-argument-comment,
  bugprone-assert-side-effect,
  bugprone-bad-signal-to-kill-thread,
  bugprone-branch-clone,
  bugprone-copy-constructor-init,
  bugprone-dangling-handle,
  bugprone-dynamic-static-initializers,
  bugprone-fold-init-type,
  bugprone-forward-declaration-namespace,
  bugprone-forwarding-reference-overload,
  bugprone-inaccurate-erase,
  bugprone-incorrect-roundings,
  bugprone-integer-division,
  bugprone-lambda-function-name,
  bugprone-macro-parentheses,
  bugprone-macro-repeated-side-effects,
  bugprone-misplaced-operator-in-strlen-in-alloc,
  bugprone-misplaced-pointer-arithmetic-in-alloc,
  bugprone-misplaced-widening-cast,
  bugprone-move-forwarding-reference,
  bugprone-multiple-statement-macro,
  bugprone-no-escape,
  bugprone-not-null-terminated-result,
  bugprone-parent-virtual-call,
  bugprone-posix-return,
  bugprone-reserved-identifier,
  bugprone-sizeof-container,
  bugprone-sizeof-expression,
  bugprone-spuriously-wake-up-functions,
  bugprone-string-constructor,
  bugprone-string-integer-assignment,
  bugprone-string-literal-with-embedded-nul,
  bugprone-suspicious-enum-usage,
  bugprone-suspicious-include,
  bugprone-suspicious-memset-usage,
  bugprone-suspicious-missing-comma,
  bugprone-suspicious-semicolon,
  bugprone-suspicious-string-compare,
  bugprone-swapped-arguments,
  bugprone-terminating-continue,
  bugprone-throw-keyword-missing,
  bugprone-too-small-loop-variable,
  bugprone-undefined-memory-manipulation,
  bugprone-undelegated-constructor,
  bugprone-unhandled-self-assignment,
  bugprone-unused-raii,
  bugprone-unused-return-value,
  bugprone-use-after-move,
  bugprone-virtual-near-miss,
  cert-dcl21-cpp,
  cert-dcl58-cpp,
  cert-err34-c,
  cert-err52-cpp,
  cert-err58-cpp,
  cert-err60-cpp,
  cert-flp30-c,
  cert-msc50-cpp,
  cert-msc51-cpp,
  cert-str34-c,
  cppcoreguidelines-interfaces-global-init,
  cppcoreguidelines-narrowing-conversions,
  cppcoreguidelines-pro-type-member-init,
  cppcoreguidelines-pro-type-static-cast-downcast,
  cppcoreguidelines-slicing,
  google-default-arguments,
  google-explicit-constructor,
  google-runtime-operator,
  hicpp-exception-baseclass,
  hicpp-multiway-paths-covered,
  misc-misplaced-const,
  misc-new-delete-overloads,
  misc-no-recursion,
  misc-non-copyable-objects,
  misc-throw-by-value-catch-by-reference,
  misc-unconventional-assign-operator,
  misc-uniqueptr-reset-release,
  modernize-avoid-bind,
  modernize-concat-nested-namespaces,
  modernize-deprecated-headers,
  modernize-deprecated-ios-base-aliases,
  modernize-loop-convert,
  modernize-make-shared,
  modernize-make-unique,
  modernize-pass-by-value,
  modernize-raw-string-literal,
  modernize-redundant-void-arg,
  modernize-replace-auto-ptr,
  modernize-replace-disallow-copy-and-assign-macro,
  modernize-replace-random-shuffle,
  modernize-return-braced-init-list,
  modernize-shrink-to-fit,
  modernize-unary-static-assert,
  modernize-use-auto,
  modernize-use-bool-literals,
  modernize-use-emplace,
  modernize-use-equals-default,
  modernize-use-equals-delete,
  modernize-use-nodiscard,
  modernize-use-noexcept,
  modernize-use-nullptr,
  modernize-use-override,
  modernize-use-transparent-functors,
  modernize-use-uncaught-exceptions,
  mpi-buffer-deref,
  mpi-type-mismatch,
  openmp-use-default-none,
  performance-faster-string-find,
  performance-for-range-copy,
  performance-implicit-conversion-in-loop,
  performance-inefficient-algorithm,
  performance-inefficient-string-concatenation,
  performance-inefficient-vector-operation,
  performance-move-const-arg,
  performance-move-constructor-init,
  performance-no-automatic-move,
  performance-noexcept-move-constructor,
  performance-trivially-destructible,
  performance-type-promotion-in-math-fn,
  performance-unnecessary-copy-initialization,
  performance-unnecessary-value-param,
  portability-simd-intrinsics,
  readability-avoid-const-params-in-decls,
  readability-const-return-type,
  readability-container-size-empty,
  readability-convert-member-functions-to-static,
  readability-delete-null-pointer,
  readability-deleted-default,
  readability-inconsistent-declaration-parameter-name,
  readability-make-member-function-const,
  readability-misleading-indentation,
  readability-misplaced-array-index,
  readability-non-const-parameter,
  readability-redundant-control-flow,
  readability-redundant-declaration,
  readability-redundant-function-ptr-dereference,
  readability-redundant-smartptr-get,
  readability-redundant-string-cstr,
  readability-redundant-string-init,
  readability-simplify-subscript-expr,
  readability-static-accessed-through-instance,
  readability-static-definition-in-anonymous-namespace,
  readability-string-compare,
  readability-uniqueptr-delete-release,
  readability-use-anyofallof
WarningsAsErrors: ''
HeaderFilterRegex: ''
CheckOptions:
  - key: modernize-replace-auto-ptr.IncludeStyle
    value: llvm
  - key: performance-move-const-arg.CheckTriviallyCopyableMove
    value: "true"
  - key: modernize-use-auto.MinTypeNameLength
    value: "5"
  - key: readability-static-accessed-through-instance.NameSpecifierNestingThreshold
    value: "3"
  - key: bugprone-reserved-identifier.Invert
    value: "false"
  - key: bugprone-unused-return-value.CheckedFunctions
    value: "::std::async;::std::launder;::std::remove;::std::remove_if;::std::unique;::std::unique_ptr::release;::std::basic_string::empty;::std::vector::empty;::std::back_inserter;::std::distance;::std::find;::std::find_if;::std::inserter;::std::lower_bound;::std::make_pair;::std::map::count;::std::map::find;::std::map::lower_bound;::std::multimap::equal_range;::std::multimap::upper_bound;::std::set::count;::std::set::find;::std::setfill;::std::setprecision;::std::setw;::std::upper_bound;::std::vector::at;::bsearch;::ferror;::feof;::isalnum;::isalpha;::isblank;::iscntrl;::isdigit;::isgraph;::islower;::isprint;::ispunct;::isspace;::isupper;::iswalnum;::iswprint;::iswspace;::isxdigit;::memchr;::memcmp;::strcmp;::strcoll;::strncmp;::strpbrk;::strrchr;::strspn;::strstr;::wcscmp;::access;::bind;::connect;::difftime;::dlsym;::fnmatch;::getaddrinfo;::getopt;::htonl;::htons;::iconv_open;::inet_addr;::isascii;::isatty;::mmap;::newlocale;::openat;::pathconf;::pthread_equal;::pthread_getspecific;::pthread_mutex_trylock;::readdir;::readlink;::recvmsg;::regexec;::scandir;::semget;::setjmp;::shm_open;::shmget;::sigismember;::strcasecmp;::strsignal;::ttyname"
  - key: cert-dcl16-c.NewSuffixes
    value: "L;LL;LU;LLU"
  - key: readability-inconsistent-declaration-parameter-name.Strict
    value: "false"
  - key: modernize-use-override.AllowOverrideAndFinal
    value: "false"
  - key: modernize-pass-by-value.ValuesOnly
    value: "false"
  - key: modernize-loop-convert.IncludeStyle
    value: llvm
  - key: cert-str34-c.DiagnoseSignedUnsignedCharComparisons
    value: "false"
  - key: bugprone-suspicious-string-compare.WarnOnLogicalNotComparison
    value: "false"
  - key: readability-redundant-smartptr-get.IgnoreMacros
    value: "true"
  - key: bugprone-argument-comment.CommentNullPtrs
    value: "0"
  - key: bugprone-suspicious-string-compare.WarnOnImplicitComparison
    value: "true"
  - key: modernize-use-emplace.TupleTypes
    value: "::std::pair;::std::tuple"
  - key: modernize-use-emplace.TupleMakeFunctions
    value: "::std::make_pair;::std::make_tuple"
  - key: cppcoreguidelines-narrowing-conversions.WarnOnFloatingPointNarrowingConversion
    value: "true"
  - key: bugprone-argument-comment.StrictMode
    value: "0"
  - key: modernize-use-nodiscard.ReplacementString
    value: "[[nodiscard]]"
  - key: modernize-loop-convert.MakeReverseRangeHeader
    value: ""
  - key: modernize-replace-random-shuffle.IncludeStyle
    value: llvm
  - key: modernize-use-bool-literals.IgnoreMacros
    value: "true"
  - key: bugprone-unhandled-self-assignment.WarnOnlyIfThisHasSuspiciousField
    value: "true"
  - key: google-readability-namespace-comments.ShortNamespaceLines
    value: "10"
  - key: bugprone-suspicious-string-compare.StringCompareLikeFunctions
    value: ""
  - key: modernize-avoid-bind.PermissiveParameterList
    value: "false"
  - key: modernize-use-override.FinalSpelling
    value: final
  - key: performance-move-constructor-init.IncludeStyle
    value: llvm
  - key: modernize-loop-convert.UseCxx20ReverseRanges
    value: "true"
  - key: modernize-use-noexcept.ReplacementString
    value: ""
  - key: performance-type-promotion-in-math-fn.IncludeStyle
    value: llvm
  - key: modernize-loop-convert.NamingStyle
    value: CamelCase
  - key: bugprone-suspicious-include.ImplementationFileExtensions
    value: "c;cc;cpp;cxx"
  - key: cppcoreguidelines-pro-type-member-init.UseAssignment
    value: "false"
  - key: bugprone-suspicious-missing-comma.SizeThreshold
    value: "5"
  - key: bugprone-suspicious-include.HeaderFileExtensions
    value: ";h;hh;hpp;hxx"
  - key: performance-no-automatic-move.AllowedTypes
    value: ""
  - key: performance-for-range-copy.WarnOnAllAutoCopies
    value: "false"
  - key: bugprone-argument-comment.CommentIntegerLiterals
    value: "0"
  - key: modernize-loop-convert.MakeReverseRangeFunction
    value: ""
  - key: readability-inconsistent-declaration-parameter-name.IgnoreMacros
    value: "true"
  - key: hicpp-multiway-paths-covered.WarnOnMissingElse
    value: "false"
  - key: modernize-pass-by-value.IncludeStyle
    value: llvm
  - key: bugprone-sizeof-expression.WarnOnSizeOfThis
    value: "true"
  - key: bugprone-string-constructor.WarnOnLargeLength
    value: "true"
  - key: bugprone-too-small-loop-variable.MagnitudeBitsUpperLimit
    value: "16"
  - key: bugprone-argument-comment.CommentFloatLiterals
    value: "0"
  - key: bugprone-argument-comment.CommentCharacterLiterals
    value: "0"
  - key: modernize-use-nullptr.NullMacros
    value: "NULL"
  - key: modernize-make-shared.IgnoreMacros
    value: "true"
  - key: bugprone-dynamic-static-initializers.HeaderFileExtensions
    value: ";h;hh;hpp;hxx"
  - key: bugprone-suspicious-enum-usage.StrictMode
    value: "false"
  - key: performance-unnecessary-copy-initialization.AllowedTypes
    value: ""
  - key: bugprone-suspicious-missing-comma.MaxConcatenatedTokens
    value: "5"
  - key: modernize-use-transparent-functors.SafeMode
    value: "false"
  - key: cppcoreguidelines-narrowing-conversions.PedanticMode
    value: "false"
  - key: modernize-make-shared.IgnoreDefaultInitialization
    value: "true"
  - key: bugprone-not-null-terminated-result.WantToUseSafeFunctions
    value: "true"
  - key: modernize-make-shared.IncludeStyle
    value: llvm
  - key: bugprone-string-constructor.LargeLengthThreshold
    value: "8388608"
  - key: misc-throw-by-value-catch-by-reference.CheckThrowTemporaries
    value: "true"
  - key: cert-oop54-cpp.WarnOnlyIfThisHasSuspiciousField
    value: "0"
  - key: modernize-use-override.IgnoreDestructors
    value: "false"
  - key: performance-inefficient-vector-operation.EnableProto
    value: "false"
  - key: modernize-make-shared.MakeSmartPtrFunction
    value: "std::make_shared"
  - key: modernize-loop-convert.MaxCopySize
    value: "16"
  - key: bugprone-argument-comment.CommentStringLiterals
    value: "0"
  - key: portability-simd-intrinsics.Suggest
    value: "false"
  - key: cppcoreguidelines-explicit-virtual-functions.IgnoreDestructors
    value: "1"
  - key: performance-for-range-copy.AllowedTypes
    value: ""
  - key: modernize-make-shared.MakeSmartPtrFunctionHeader
    value: "<memory>"
  - key: modernize-make-unique.IgnoreMacros
    value: "true"
  - key: bugprone-sizeof-expression.WarnOnSizeOfConstant
    value: "true"
  - key: readability-redundant-string-init.StringNames
    value: "::std::basic_string_view;::std::basic_string"
  - key: modernize-make-unique.IgnoreDefaultInitialization
    value: "true"
  - key: modernize-use-emplace.ContainersWithPushBack
    value: "::std::vector;::std::list;::std::deque"
  - key: modernize-make-unique.IncludeStyle
    value: llvm
  - key: bugprone-argument-comment.CommentBoolLiterals
    value: "0"
  - key: bugprone-argument-comment.CommentUserDefinedLiterals
    value: "0"
  - key: modernize-use-override.OverrideSpelling
    value: override
  - key: readability-redundant-declaration.IgnoreMacros
    value: "true"
  - key: performance-inefficient-string-concatenation.StrictMode
    value: "false"
  - key: google-readability-braces-around-statements.ShortStatementLines
    value: "1"
  - key: modernize-make-unique.MakeSmartPtrFunction
    value: "std::make_unique"
  - key: cppcoreguidelines-pro-type-member-init.IgnoreArrays
    value: "false"
  - key: bugprone-reserved-identifier.AllowedIdentifiers
    value: ""
  - key: modernize-use-emplace.IgnoreImplicitConstructors
    value: "false"
  - key: modernize-make-unique.MakeSmartPtrFunctionHeader
    value: "<memory>"
  - key: modernize-use-equals-delete.IgnoreMacros
    value: "true"
  - key: bugprone-misplaced-widening-cast.CheckImplicitCasts
    value: "false"
  - key: bugprone-suspicious-missing-comma.RatioThreshold
    value: "0.200000"
  - key: modernize-loop-convert.MinConfidence
    value: reasonable
  - key: misc-throw-by-value-catch-by-reference.MaxSize
    value: "-1"
  - key: performance-unnecessary-value-param.AllowedTypes
    value: ""
  - key: modernize-use-noexcept.UseNoexceptFalse
    value: "true"
  - key: google-readability-namespace-comments.SpacesBeforeComments
    value: "2"
  - key: cppcoreguidelines-non-private-member-variables-in-classes.IgnoreClassesWithAllMemberVariablesBeingPublic
    value: "1"
  - key: bugprone-argument-comment.IgnoreSingleArgument
    value: "0"
  - key: bugprone-sizeof-expression.WarnOnSizeOfIntegerExpression
    value: "false"
  - key: performance-faster-string-find.StringLikeClasses
    value: "::std::basic_string;::std::basic_string_view"
  - key: bugprone-assert-side-effect.CheckFunctionCalls
    value: "false"
  - key: bugprone-string-constructor.StringNames
    value: "::std::basic_string;::std::basic_string_view"
  - key: bugprone-assert-side-effect.AssertMacros
    value: assert,NSAssert,NSCAssert
  - key: llvm-qualified-auto.AddConstToQualified
    value: "0"
  - key: cert-str34-c.CharTypdefsToIgnore
    value: ""
  - key: google-readability-function-size.StatementThreshold
    value: "800"
  - key: llvm-else-after-return.WarnOnConditionVariables
    value: "0"
  - key: cert-msc51-cpp.DisallowedSeedTypes
    value: "time_t,std::time_t"
  - key: bugprone-sizeof-expression.WarnOnSizeOfCompareToConstant
    value: "true"
  - key: bugprone-reserved-identifier.AggressiveDependentMemberLookup
    value: "false"
  - key: modernize-use-equals-default.IgnoreMacros
    value: "true"
  - key: modernize-raw-string-literal.DelimiterStem
    value: lit
  - key: misc-throw-by-value-catch-by-reference.WarnOnLargeObjects
    value: "false"
  - key: modernize-raw-string-literal.ReplaceShorterLiterals
    value: "false"
  - key: modernize-use-emplace.SmartPointers
    value: "::std::shared_ptr;::std::unique_ptr;::std::auto_ptr;::std::weak_ptr"
  - key: bugprone-dangling-handle.HandleClasses
    value: "std::basic_string_view;std::experimental::basic_string_view"
  - key: performance-inefficient-vector-operation.VectorLikeClasses
    value: "::std::vector"
  - key: modernize-use-auto.RemoveStars
    value: "false"
  - key: portability-simd-intrinsics.Std
    value: ""
  - key: performance-unnecessary-value-param.IncludeStyle
    value: llvm
  - key: modernize-replace-disallow-copy-and-assign-macro.MacroName
    value: DISALLOW_COPY_AND_ASSIGN
  - key: llvm-else-after-return.WarnOnUnfixable
    value: "0"
  - key: readability-simplify-subscript-expr.Types
    value: "::std::basic_string;::std::basic_string_view;::std::vector;::std::array"
```

## .clang-format

这是从clion上导出的

```yaml
# Generated from CLion C/C++ Code Style settings
BasedOnStyle: LLVM
AccessModifierOffset: -4
AlignAfterOpenBracket: Align
AlignConsecutiveAssignments: None
AlignOperands: Align
AllowAllArgumentsOnNextLine: false
AllowAllConstructorInitializersOnNextLine: false
AllowAllParametersOfDeclarationOnNextLine: false
AllowShortBlocksOnASingleLine: false
AllowShortCaseLabelsOnASingleLine: false
AllowShortFunctionsOnASingleLine: None
AllowShortIfStatementsOnASingleLine: false
AllowShortLambdasOnASingleLine: All
AllowShortLoopsOnASingleLine: false
AlwaysBreakAfterReturnType: None
AlwaysBreakTemplateDeclarations: Yes
BreakBeforeBraces: Allman
BraceWrapping:
  AfterCaseLabel: false
  AfterClass: false
  AfterControlStatement: Never
  AfterEnum: false
  AfterFunction: false
  AfterNamespace: false
  AfterUnion: false
  BeforeCatch: false
  BeforeElse: false
  IndentBraces: false
  SplitEmptyFunction: false
  SplitEmptyRecord: true
BreakBeforeBinaryOperators: None
BreakBeforeTernaryOperators: true
BreakConstructorInitializers: BeforeColon
BreakInheritanceList: BeforeColon
ColumnLimit: 100
CompactNamespaces: false
ContinuationIndentWidth: 8
IndentCaseLabels: true
IndentPPDirectives: None
IndentWidth: 4
KeepEmptyLinesAtTheStartOfBlocks: true
MaxEmptyLinesToKeep: 1
NamespaceIndentation: All
ObjCSpaceAfterProperty: false
ObjCSpaceBeforeProtocolList: true
PointerAlignment: Right
ReflowComments: false
SpaceAfterCStyleCast: true
SpaceAfterLogicalNot: false
SpaceAfterTemplateKeyword: false
SpaceBeforeAssignmentOperators: true
SpaceBeforeCpp11BracedList: false
SpaceBeforeCtorInitializerColon: true
SpaceBeforeInheritanceColon: true
SpaceBeforeParens: ControlStatements
SpaceBeforeRangeBasedForLoopColon: false
SpaceInEmptyParentheses: false
SpacesBeforeTrailingComments: 0
SpacesInAngles: false
SpacesInCStyleCastParentheses: false
SpacesInContainerLiterals: false
SpacesInParentheses: false
SpacesInSquareBrackets: false
TabWidth: 4
UseTab: Never