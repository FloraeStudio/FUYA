# FUYA 重複文章修復腳本（PowerShell 版）
# 用途：刪除「調整後台」commit 誤增的檔名亂碼重複文章，保留原本正確命名的檔案，
#       並簡化 admin/config.yml 裡 Decap CMS 不支援的三元運算子 summary 語法。
#
# 使用方式：
#   1. 把這個檔案放到 FUYA repo 根目錄（跟 _config.yml 同一層）
#   2. 在 PowerShell 執行：
#        Set-ExecutionPolicy -Scope Process Bypass
#        .\fix_duplicates.ps1
#   3. 跑完會自動建立一個 git commit，但不會自動 push，請自行檢查後執行 git push

$ErrorActionPreference = "Stop"

if (-not (Test-Path ".git")) {
    Write-Host "ERROR: current folder is not the git repo root. Please cd to the FUYA project root first." -ForegroundColor Red
    exit 1
}

$pairs = @(
    @{ Keep = "source/_posts/commission/【原創】月光灑落的地方.md"; Remove = "source/_posts/commission/#U3010#U539f#U5275#U3011#U6708#U5149#U7051#U843d#U7684#U5730#U65b9.md" }
    @{ Keep = "source/_posts/commission/【原創】輝夜姬之夢-春の.md"; Remove = "source/_posts/commission/#U3010#U539f#U5275#U3011#U8f1d#U591c#U59ec#U4e4b#U5922-#U6625#U306e.md" }
    @{ Keep = "source/_posts/commission/【原創】輝夜姬之夢-1.md"; Remove = "source/_posts/commission/#U3010#U539f#U5275#U3011#U8f1d#U591c#U59ec#U4e4b#U5922-1.md" }
    @{ Keep = "source/_posts/commission/【原創】輝夜姬之夢.md"; Remove = "source/_posts/commission/#U3010#U539f#U5275#U3011#U8f1d#U591c#U59ec#U4e4b#U5922.md" }
    @{ Keep = "source/_posts/gacha/【二創】充電.md"; Remove = "source/_posts/gacha/#U3010#U4e8c#U5275#U3011#U5145#U96fb.md" }
    @{ Keep = "source/_posts/gacha/【原創】一下就好.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U4e00#U4e0b#U5c31#U597d.md" }
    @{ Keep = "source/_posts/gacha/【原創】交換禮物.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U4ea4#U63db#U79ae#U7269.md" }
    @{ Keep = "source/_posts/gacha/【原創】光行時間.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U5149#U884c#U6642#U9593.md" }
    @{ Keep = "source/_posts/gacha/【原創】咬蘋果.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U54ac#U860b#U679c.md" }
    @{ Keep = "source/_posts/gacha/【原創】唇色.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U5507#U8272.md" }
    @{ Keep = "source/_posts/gacha/【原創】夢境.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U5922#U5883.md" }
    @{ Keep = "source/_posts/gacha/【原創】情書.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U60c5#U66f8.md" }
    @{ Keep = "source/_posts/gacha/【原創】救援任務.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U6551#U63f4#U4efb#U52d9.md" }
    @{ Keep = "source/_posts/gacha/【原創】氣味.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U6c23#U5473.md" }
    @{ Keep = "source/_posts/gacha/【原創】流星.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U6d41#U661f.md" }
    @{ Keep = "source/_posts/gacha/【原創】玫瑰情人節.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U73ab#U7470#U60c5#U4eba#U7bc0.md" }
    @{ Keep = "source/_posts/gacha/【原創】生日禮物.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U751f#U65e5#U79ae#U7269.md" }
    @{ Keep = "source/_posts/gacha/【原創】聖誕禮物.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U8056#U8a95#U79ae#U7269.md" }
    @{ Keep = "source/_posts/gacha/【原創】蒹葭.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U84b9#U846d.md" }
    @{ Keep = "source/_posts/gacha/【原創】螢火.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U87a2#U706b.md" }
    @{ Keep = "source/_posts/gacha/【原創】親密任務.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U89aa#U5bc6#U4efb#U52d9.md" }
    @{ Keep = "source/_posts/gacha/【原創】那套西裝的來歷.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U90a3#U5957#U897f#U88dd#U7684#U4f86#U6b77.md" }
    @{ Keep = "source/_posts/gacha/【原創】雨夜與擁抱.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011#U96e8#U591c#U8207#U64c1#U62b1.md" }
    @{ Keep = "source/_posts/gacha/【原創】rain-rain-go-away.md"; Remove = "source/_posts/gacha/#U3010#U539f#U5275#U3011rain-rain-go-away.md" }
    @{ Keep = "source/_posts/gacha/【夢向】一方天台.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U4e00#U65b9#U5929#U53f0.md" }
    @{ Keep = "source/_posts/gacha/【夢向】冬日插曲.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U51ac#U65e5#U63d2#U66f2.md" }
    @{ Keep = "source/_posts/gacha/【夢向】回家.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U56de#U5bb6.md" }
    @{ Keep = "source/_posts/gacha/【夢向】夏天的味道.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U590f#U5929#U7684#U5473#U9053.md" }
    @{ Keep = "source/_posts/gacha/【夢向】夏日海灘.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U590f#U65e5#U6d77#U7058.md" }
    @{ Keep = "source/_posts/gacha/【夢向】平安.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U5e73#U5b89.md" }
    @{ Keep = "source/_posts/gacha/【夢向】心願.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U5fc3#U9858.md" }
    @{ Keep = "source/_posts/gacha/【夢向】悪い夢.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U60aa#U3044#U5922.md" }
    @{ Keep = "source/_posts/gacha/【夢向】意外的擁抱.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U610f#U5916#U7684#U64c1#U62b1.md" }
    @{ Keep = "source/_posts/gacha/【夢向】日本no-1.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U65e5#U672cno-1.md" }
    @{ Keep = "source/_posts/gacha/【夢向】早晨搭訕.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U65e9#U6668#U642d#U8a15.md" }
    @{ Keep = "source/_posts/gacha/【夢向】未署名情書.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U672a#U7f72#U540d#U60c5#U66f8.md" }
    @{ Keep = "source/_posts/gacha/【夢向】槲寄生下的吻.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U69f2#U5bc4#U751f#U4e0b#U7684#U543b.md" }
    @{ Keep = "source/_posts/gacha/【夢向】煙火燦爛時.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U7159#U706b#U71e6#U721b#U6642.md" }
    @{ Keep = "source/_posts/gacha/【夢向】親親情人節.md"; Remove = "source/_posts/gacha/#U3010#U5922#U5411#U3011#U89aa#U89aa#U60c5#U4eba#U7bc0.md" }
    @{ Keep = "source/_posts/misc/建立了自己的委託網站.md"; Remove = "source/_posts/misc/#U5efa#U7acb#U4e86#U81ea#U5df1#U7684#U59d4#U8a17#U7db2#U7ad9.md" }
    @{ Keep = "source/_posts/projects/企劃頁籌備中.md"; Remove = "source/_posts/projects/#U4f01#U5283#U9801#U7c4c#U5099#U4e2d.md" }
)

$restored = 0
$removed = 0

foreach ($pair in $pairs) {
    $keep = $pair.Keep
    $remove = $pair.Remove

    if (-not (Test-Path -LiteralPath $keep)) {
        git checkout HEAD -- "$keep"
        $restored++
    } else {
        Write-Host "(already exists, skip restore) $keep"
    }

    if (Test-Path -LiteralPath $remove) {
        git rm -f -- "$remove" | Out-Null
        $removed++
    } else {
        Write-Host "(not found, skip remove) $remove"
    }
}

# Fix admin/config.yml summary syntax:
# Any "summary:" line that references fields.pin with a ternary gets simplified,
# since Decap CMS does not support ternary expressions inside {{ }}.
$configPath = "source/admin/config.yml"
if (Test-Path $configPath) {
    $lines = Get-Content -LiteralPath $configPath -Encoding UTF8
    $changed = $false
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^(\s*summary:\s*)''.*fields\.pin \?.*$') {
            $indent = $Matches[1]
            $lines[$i] = $indent + "'{{title}}" + [char]0xFF5C + "{{fields.date}}'"
            $changed = $true
        }
    }
    if ($changed) {
        [System.IO.File]::WriteAllLines((Resolve-Path $configPath), $lines, (New-Object System.Text.UTF8Encoding($false)))
        git add $configPath
        Write-Host "config.yml summary syntax fixed (removed unsupported ternary)."
    } else {
        Write-Host "No matching summary line found in config.yml; it may already be fixed. Please check manually."
    }
} else {
    Write-Host "$configPath not found, skipping summary fix step."
}

Write-Host ""
Write-Host "Done: restored $restored original files, removed $removed duplicate garbled files."

$status = git status --porcelain
if ($status) {
    git commit -m "fix duplicate posts: remove garbled-filename duplicates, simplify CMS summary syntax"
    Write-Host ""
    Write-Host "Commit created. Please check git log / git diff, then run: git push" -ForegroundColor Green
} else {
    Write-Host "Nothing to commit (it may already be fixed)."
}