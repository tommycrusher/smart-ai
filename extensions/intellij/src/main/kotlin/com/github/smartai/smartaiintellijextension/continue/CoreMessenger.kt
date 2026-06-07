package com.github.smartai.smartaiintellijextension.`continue`

import com.github.smartai.smartaiintellijextension.browser.SmartAiBrowserService.Companion.getBrowser
import com.github.smartai.smartaiintellijextension.constants.MessageTypes
import com.github.smartai.smartaiintellijextension.`continue`.process.SmartAiBinaryProcess
import com.github.smartai.smartaiintellijextension.`continue`.process.SmartAiProcessHandler
import com.github.smartai.smartaiintellijextension.`continue`.process.SmartAiSocketProcess
import com.github.smartai.smartaiintellijextension.services.SmartAiPluginService
import com.github.smartai.smartaiintellijextension.services.GsonService
import com.github.smartai.smartaiintellijextension.utils.uuid
import com.google.gson.JsonSyntaxException
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.CoroutineScope

class CoreMessenger(
    private val project: Project,
    private val ideProtocolClient: IdeProtocolClient,
    val coroutineScope: CoroutineScope,
    private val onUnexpectedExit: () -> Unit,
    private val gsonService: GsonService = service<GsonService>(),
) {
    private val gson = gsonService.gson
    private val responseListeners = mutableMapOf<String, (Any?) -> Unit>()
    private var process = startSmartAiProcess()
    private val log = Logger.getInstance(CoreMessenger::class.java.simpleName)

    fun request(messageType: String, data: Any?, messageId: String?, onResponse: (Any?) -> Unit) {
        val id = messageId ?: uuid()
        val message = gson.toJson(mapOf("messageId" to id, "messageType" to messageType, "data" to data))
        responseListeners[id] = onResponse
        process.write(message)
    }

    private fun startSmartAiProcess(): SmartAiProcessHandler {
        val isTcp = System.getenv("USE_TCP")?.toBoolean() ?: false
        val process = if (isTcp)
            SmartAiSocketProcess()
        else
            SmartAiBinaryProcess(onUnexpectedExit)
        return SmartAiProcessHandler(coroutineScope, process, ::handleMessage)
    }

    private fun handleMessage(json: String) {
        val responseMap = tryToParse(json) ?: return
        val messageId = responseMap["messageId"].toString()
        val messageType = responseMap["messageType"].toString()
        val data = responseMap["data"]

        // IDE listeners
        if (messageType in MessageTypes.IDE_MESSAGE_TYPES) {
            ideProtocolClient.handleMessage(json) { data ->
                val message = gson.toJson(mapOf("messageId" to messageId, "messageType" to messageType, "data" to data))
                process.write(message)
            }
        }

        // Forward to webview
        if (messageType in MessageTypes.PASS_THROUGH_TO_WEBVIEW) {
            project.getBrowser()?.sendToWebview(messageType, responseMap["data"], messageId)
        }

        // Responses for messageId
        responseListeners[messageId]?.let { listener ->
            listener(data)
            @Suppress("UNCHECKED_CAST")
            val done = (data as? Map<String, Any>)?.get("done") as? Boolean

            // Remove unless explicitly streaming (done == false)
            if (done != false) {
                responseListeners.remove(messageId)
            }
        }
    }

    // todo: map<*, *> = code smell
    private fun tryToParse(json: String): Map<*, *>? =
        try {
            gson.fromJson(json, Map::class.java)
        } catch (_: JsonSyntaxException) {
            log.warn("Invalid message JSON: $json") // example: NODE_ENV undefined
            null
        }

    fun restart() {
        log.warn("Restarting Continue process")
        responseListeners.clear()
        process.close()
        process = startSmartAiProcess()
    }

    fun close() {
        log.warn("Closing Continue process")
        process.close()
    }
}