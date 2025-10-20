package com.playapp.tv;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		// Ensure the WebView is focusable so D-pad and remote events are received
		if (getBridge() != null && getBridge().getWebView() != null) {
			View webView = getBridge().getWebView().getView();
			if (webView != null) {
				webView.setFocusable(true);
				webView.setFocusableInTouchMode(true);
				webView.requestFocus();
			}
		}
	}

	@Override
	public boolean onKeyDown(int keyCode, KeyEvent event) {
		// Forward key events to the WebView so the web UI can handle D-pad/enter/back
		if (getBridge() != null && getBridge().getWebView() != null) {
			View webView = getBridge().getWebView().getView();
			if (webView != null) {
				webView.dispatchKeyEvent(event);
				return true;
			}
		}

		return super.onKeyDown(keyCode, event);
	}
}
