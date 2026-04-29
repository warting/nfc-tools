package se.warting.nfctools.scanner

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class MainActivity : ComponentActivity() {

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var prefs: SharedPreferences

    private val state = mutableStateOf(ScannerState())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("nfc-scanner", Context.MODE_PRIVATE)
        state.value = state.value.copy(
            url = prefs.getString("url", "").orEmpty(),
            title = prefs.getString("title", "").orEmpty(),
        )

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        if (nfcAdapter == null) {
            state.value = state.value.copy(error = "This device has no NFC.")
        } else if (!nfcAdapter!!.isEnabled) {
            state.value = state.value.copy(error = "NFC is turned off — enable it in system settings.")
        }

        setContent {
            MaterialTheme {
                ScannerScreen(
                    state = state.value,
                    onUrlChange = { v ->
                        state.value = state.value.copy(url = v)
                        prefs.edit().putString("url", v).apply()
                    },
                    onTitleChange = { v ->
                        state.value = state.value.copy(title = v)
                        prefs.edit().putString("title", v).apply()
                    },
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val adapter = nfcAdapter ?: return
        if (!adapter.isEnabled) return
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_MUTABLE
        else
            0
        val pending = PendingIntent.getActivity(this, 0, intent, flags)
        adapter.enableForegroundDispatch(this, pending, null, null)
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        else
            @Suppress("DEPRECATION") intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        val uid = tag?.id?.toColonHex() ?: return
        sendUid(uid)
    }

    private fun sendUid(uid: String) {
        val current = state.value
        val url = current.url.trim()
        if (url.isEmpty()) {
            state.value = current.copy(error = "Set a webhook URL first.", status = "Read $uid")
            return
        }
        state.value = current.copy(status = "Read $uid, sending…", error = null)

        lifecycleScope.launch {
            try {
                val full = buildUrl(url, uid, current.title.trim().takeIf { it.isNotEmpty() })
                withContext(Dispatchers.IO) { httpGet(full) }
                state.value = state.value.copy(status = "Sent $uid to your Homey.", error = null)
            } catch (e: Exception) {
                state.value = state.value.copy(error = e.message ?: "Send failed.", status = "")
            }
        }
    }
}

private data class ScannerState(
    val url: String = "",
    val title: String = "",
    val status: String = "Idle. Hold a tag against the back of the phone.",
    val error: String? = null,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScannerScreen(
    state: ScannerState,
    onUrlChange: (String) -> Unit,
    onTitleChange: (String) -> Unit,
) {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("NFC tools — phone scanner", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Hold a tag against the back of the phone. Its UID is forwarded to the Homey webhook.",
                style = MaterialTheme.typography.bodyMedium,
            )
            OutlinedTextField(
                value = state.url,
                onValueChange = onUrlChange,
                label = { Text("Webhook URL") },
                placeholder = { Text("https://webhooks.athom.com/webhook/<id>?homey=<homeyId>") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                singleLine = true,
            )
            OutlinedTextField(
                value = state.title,
                onValueChange = onTitleChange,
                label = { Text("Optional title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(Modifier.fillMaxWidth())
            state.error?.let { err ->
                Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }
            Text(state.status, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun ByteArray.toColonHex(): String =
    joinToString(":") { "%02x".format(it) }

private fun buildUrl(base: String, uid: String, title: String?): String {
    val sep = if (base.contains('?')) "&" else "?"
    val titlePart = if (title.isNullOrBlank()) "" else "&title=" + URLEncoder.encode(title, "UTF-8")
    return base + sep + "uid=" + URLEncoder.encode(uid, "UTF-8") + titlePart
}

private fun httpGet(url: String) {
    val conn = (URL(url).openConnection() as HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 10_000
        readTimeout = 10_000
    }
    try {
        val code = conn.responseCode
        if (code !in 200..299) throw IOException("HTTP $code")
    } finally {
        conn.disconnect()
    }
}
