package com.github.smartai.smartaiintellijextension.`continue`.process

import java.io.InputStream
import java.io.OutputStream
import java.net.Socket

class SmartAiSocketProcess : SmartAiProcess {

    private val socket = Socket("127.0.0.1", 3000)
    override val input: InputStream = socket.inputStream
    override val output: OutputStream = socket.outputStream

    override fun close() =
        socket.close()

}
