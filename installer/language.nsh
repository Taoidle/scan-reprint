; Application-language preference and installer UI are distinct.
; Only enum values reach a per-user hint; existing language.json always wins.
!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"
!ifndef BUILD_UNINSTALLER
Var YovalLanguage
Var YovalDialog
Var YovalAuto
Var YovalChinese
Var YovalEnglish

Function YovalApplyLanguage
  ${If} $YovalLanguage == "en"
    StrCpy $LANGUAGE 1033
  ${ElseIf} $YovalLanguage == "zh-CN"
    StrCpy $LANGUAGE 2052
  ${Else}
    System::Call 'kernel32::GetUserDefaultUILanguage() i .r0'
    IntOp $0 $0 & 1023
    ${If} $0 == 9
      StrCpy $LANGUAGE 1033
    ${Else}
      StrCpy $LANGUAGE 2052
    ${EndIf}
  ${EndIf}
FunctionEnd

!macro customInit
  StrCpy $YovalLanguage "auto"
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/APP_LANG=" $1
  ${IfNot} ${Errors}
    ${If} $1 == "auto"
    ${OrIf} $1 == "zh-CN"
    ${OrIf} $1 == "en"
      StrCpy $YovalLanguage $1
    ${Else}
      SetErrorLevel 2
      Quit
    ${EndIf}
  ${EndIf}
  Call YovalApplyLanguage
!macroend

!macro customWelcomePage
  Page custom YovalLanguagePage YovalLanguageLeave
!macroend
Function YovalLanguagePage
  !insertmacro MUI_HEADER_TEXT "语言 / Language" "YOVAL Scan Reprint"
  nsDialogs::Create 1018
  Pop $YovalDialog
  ${If} $YovalDialog == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 40u "选择安装器及应用首次使用的语言。已有用户选择不会被覆盖。$\r$\nChoose the installer and first-run app language. Existing user preferences are preserved."
  Pop $0
  ${NSD_CreateRadioButton} 0 50u 100% 16u "跟随操作系统 / Follow system (other languages: 中文)"
  Pop $YovalAuto
  ${NSD_CreateRadioButton} 0 75u 100% 16u "简体中文"
  Pop $YovalChinese
  ${NSD_CreateRadioButton} 0 100u 100% 16u "English"
  Pop $YovalEnglish
  ${If} $YovalLanguage == "en"
    ${NSD_Check} $YovalEnglish
  ${ElseIf} $YovalLanguage == "zh-CN"
    ${NSD_Check} $YovalChinese
  ${Else}
    ${NSD_Check} $YovalAuto
  ${EndIf}
  nsDialogs::Show
FunctionEnd
Function YovalLanguageLeave
  StrCpy $YovalLanguage "auto"
  ${NSD_GetState} $YovalEnglish $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $YovalLanguage "en"
  ${EndIf}
  ${NSD_GetState} $YovalChinese $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $YovalLanguage "zh-CN"
  ${EndIf}
  Call YovalApplyLanguage
FunctionEnd

!macro customInstall
  ; A machine-wide installation must not write an administrator's preference for other users.
  ${If} $installMode != "all"
    SetShellVarContext current
    CreateDirectory "$APPDATA\scan-reprint"
    FileOpen $0 "$APPDATA\scan-reprint\installer-language.txt" w
    FileWrite $0 "$YovalLanguage"
    FileClose $0
    WriteRegDWORD HKCU "${INSTALL_REGISTRY_KEY}" "Installer Language" $LANGUAGE
  ${EndIf}
!macroend
!endif

; Uninstaller respects this user's last installer UI language. Never delete user data.
!macro customUnInit
  ReadRegDWORD $0 HKCU "${INSTALL_REGISTRY_KEY}" "Installer Language"
  ${If} $0 == 1033
    StrCpy $LANGUAGE 1033
  ${Else}
    StrCpy $LANGUAGE 2052
  ${EndIf}
!macroend
