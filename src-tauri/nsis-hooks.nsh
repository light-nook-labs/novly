; Tauri NSIS installer hooks
; 默认安装目录:D:\novly;若系统无 D 盘,则回退到 Windows 默认目录(C 盘 Program Files)

!macro preInit
  ; 检查 D 盘是否存在
  ${If} ${FileExists} "D:\"
    StrCpy $INSTDIR "D:\novly"
  ${Else}
    ; 无 D 盘:使用 Windows 默认(Program Files)
    StrCpy $INSTDIR "$PROGRAMFILES64\Novly"
  ${EndIf}
!macroend
