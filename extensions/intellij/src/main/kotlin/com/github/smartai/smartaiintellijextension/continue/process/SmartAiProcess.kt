package com.github.smartai.smartaiintellijextension.`continue`.process

import java.io.InputStream
import java.io.OutputStream

interface SmartAiProcess {

    val input: InputStream
    val output: OutputStream

    fun close()

}
