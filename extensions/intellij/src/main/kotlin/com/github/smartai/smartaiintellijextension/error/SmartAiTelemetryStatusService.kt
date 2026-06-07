package com.github.smartai.smartaiintellijextension.error

import com.github.smartai.smartaiintellijextension.services.SmartAiPluginService
import com.github.smartai.smartaiintellijextension.utils.castNestedOrNull
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.ProjectManager
import kotlinx.coroutines.*
import kotlin.time.Duration.Companion.seconds

@Service
class SmartAiTelemetryStatusService : SmartAiTelemetryStatus {
    private val scope = CoroutineScope(Dispatchers.Default)

    @Volatile
    override var allowAnonymousTelemetry: Boolean = DISABLED_FALLBACK
        private set

    init {
        scope.launch {
            while (isActive) {
                poolTelemetryStatus()
                delay(10.seconds)
            }
        }
    }

    private fun poolTelemetryStatus() {
        // this works, but ideally, the project should be a dependency injected via constructor
        val project = ProjectManager.getInstance().openProjects.firstOrNull()
            ?: return
        val coreMessenger = project.service<SmartAiPluginService>().coreMessenger
            ?: return
        coreMessenger.request("config/getSerializedProfileInfo", null, null) { response ->
            allowAnonymousTelemetry =
                response.castNestedOrNull<Boolean>("content", "result", "config", "allowAnonymousTelemetry")
                    ?: DISABLED_FALLBACK
        }
    }

    private companion object {
        const val DISABLED_FALLBACK = false
    }
}