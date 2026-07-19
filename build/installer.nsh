!include "nsProcess.nsh"

; The updater in 1.1.3 starts NSIS just before Electron finishes quitting.
; Wait for the app to close, then terminate only genuinely leftover processes.
; This avoids the misleading "cannot be closed" retry dialog during updates.
!macro customCheckAppRunning
  StrCpy $R1 0

  foxEvolutionWaitLoop:
    ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    StrCmp $R0 0 foxEvolutionStillRunning foxEvolutionStopped

  foxEvolutionStillRunning:
    IntOp $R1 $R1 + 1
    IntCmp $R1 20 foxEvolutionForceClose foxEvolutionWait foxEvolutionForceClose

  foxEvolutionWait:
    DetailPrint `Waiting for "${PRODUCT_NAME}" to close...`
    Sleep 500
    Goto foxEvolutionWaitLoop

  foxEvolutionForceClose:
    DetailPrint `Closing leftover "${PRODUCT_NAME}" processes...`
    nsExec::Exec `"$SYSDIR\cmd.exe" /d /c taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
    Pop $R0
    Sleep 1200

  foxEvolutionStopped:
!macroend
