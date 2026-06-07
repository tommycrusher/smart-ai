package com.github.smartai.smartaiintellijextension.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindowManager

/**
 * Extend your action with [SmartAiToolbarAction] if you need a visible, active toolbar.
 */
abstract class SmartAiToolbarAction : AnAction() {

    abstract fun toolbarActionPerformed(project: Project)

    final override fun actionPerformed(event: AnActionEvent) {
        val project = event.project
            ?: return
        val tool = ToolWindowManager.getInstance(project).getToolWindow("Continue")
            ?: return
        tool.activate(null) // un-collapse toolbar
        toolbarActionPerformed(project)
    }

}