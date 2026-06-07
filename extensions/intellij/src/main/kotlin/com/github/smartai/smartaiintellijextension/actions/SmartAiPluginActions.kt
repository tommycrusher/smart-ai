package com.github.smartai.smartaiintellijextension.actions

import com.github.smartai.smartaiintellijextension.HighlightedCodePayload
import com.github.smartai.smartaiintellijextension.RangeInFileWithContents
import com.github.smartai.smartaiintellijextension.browser.SmartAiBrowserService
import com.github.smartai.smartaiintellijextension.browser.SmartAiBrowserService.Companion.getBrowser
import com.github.smartai.smartaiintellijextension.editor.DiffStreamService
import com.github.smartai.smartaiintellijextension.editor.EditorUtils
import com.github.smartai.smartaiintellijextension.services.SmartAiPluginService
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.PlatformDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.service
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager
import java.io.File

class RestartSmartAiProcess : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        e.project?.service<SmartAiPluginService>()?.coreMessenger?.restart()
    }
}

class AcceptDiffAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        acceptHorizontalDiff(e)
        acceptVerticalDiff(e)
    }

    private fun acceptHorizontalDiff(e: AnActionEvent) {
        val continuePluginService = e.project?.service<SmartAiPluginService>() ?: return
        continuePluginService.diffManager?.acceptDiff(null)
    }

    private fun acceptVerticalDiff(e: AnActionEvent) {
        val project = e.project ?: return
        val editor =
            e.getData(PlatformDataKeys.EDITOR) ?: FileEditorManager.getInstance(project).selectedTextEditor ?: return
        val diffStreamService = project.service<DiffStreamService>()
        diffStreamService.accept(editor)
    }
}

class RejectDiffAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        rejectHorizontalDiff(e)
        rejectVerticalDiff(e)
    }

    private fun rejectHorizontalDiff(e: AnActionEvent) {
        e.project?.service<SmartAiPluginService>()?.diffManager?.rejectDiff(null)
    }

    private fun rejectVerticalDiff(e: AnActionEvent) {
        val project = e.project ?: return
        val editor =
            e.getData(PlatformDataKeys.EDITOR) ?: FileEditorManager.getInstance(project).selectedTextEditor ?: return
        val diffStreamService = project.service<DiffStreamService>()
        diffStreamService.reject(editor)
    }
}

class FocusContinueInputWithoutClearAction : SmartAiToolbarAction() {
    override fun toolbarActionPerformed(project: Project) {
        FocusActionUtil.sendHighlightedCodeWithMessageToWebview(project, "focusContinueInputWithoutClear")
    }
}

class FocusContinueInputAction : SmartAiToolbarAction() {
    override fun toolbarActionPerformed(project: Project) {
        FocusActionUtil.sendHighlightedCodeWithMessageToWebview(project, "focusContinueInputWithNewSession")
    }
}

class NewContinueSessionAction : SmartAiToolbarAction() {
    override fun toolbarActionPerformed(project: Project) {
        project.getBrowser()?.sendToWebview("focusContinueInputWithNewSession")
    }
}

class ViewHistoryAction : SmartAiToolbarAction() {
    override fun toolbarActionPerformed(project: Project) {
        project.getBrowser()?.sendToWebview("navigateTo", mapOf("path" to "/history", "toggle" to true))
    }
}

class OpenConfigAction : SmartAiToolbarAction() {
    override fun toolbarActionPerformed(project: Project)  {
        project.getBrowser()?.sendToWebview("navigateTo", mapOf("path" to "/config", "toggle" to true))
    }
}

class ReloadBrowserAction: SmartAiToolbarAction() {
    override fun toolbarActionPerformed(project: Project) {
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Continue")
            ?: return
        val browserService = project.service<SmartAiBrowserService>()

        // Perform the reload and UI update on the Event Dispatch Thread
        ApplicationManager.getApplication().invokeLater {
            // Reload the browser service to get a new browser instance
            browserService.reload()

            val newBrowser = project.getBrowser() ?: return@invokeLater
            val newBrowserComponent = newBrowser.getComponent()

            val contentManager = toolWindow.contentManager
            contentManager.removeAllContents(true)

            val newContent = contentManager.factory.createContent(
                newBrowserComponent,
                null,
                false
            )
            contentManager.addContent(newContent)
            contentManager.setSelectedContent(newContent, true) // Request focus

            toolWindow.activate({
                // After activation, ensure the browser's input field gets focus
                newBrowser.focusOnInput()
            }, true)
        }
    }
}

class OpenLogsAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val logFile = File(System.getProperty("user.home") + "/.smart-ai/logs/core.log")
        if (logFile.exists()) {
            val virtualFile = com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByIoFile(logFile)
            if (virtualFile != null) {
                FileEditorManager.getInstance(project).openFile(virtualFile, true)
            }
        }
    }
}

object FocusActionUtil {
    fun sendHighlightedCodeWithMessageToWebview(project: Project?, messageType: String) {
        val browser = project?.getBrowser()
            ?: return
        browser.sendToWebview(messageType)
        browser.focusOnInput()
        val rif = EditorUtils.getEditor(project)?.getHighlightedRIF()
            ?: return
        val code = HighlightedCodePayload(RangeInFileWithContents(rif.filepath, rif.range, rif.contents))
        browser.sendToWebview("highlightedCode", code)
    }
}

