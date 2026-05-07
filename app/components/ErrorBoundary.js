// ════════════════════════════════════════════════════════════════
// DharmaSetu — Global React Error Boundary
// FILE: app/components/ErrorBoundary.js
//
// Catches any render-phase JS error anywhere in the tree.
// Prevents the dreaded white screen of death.
// Shows a dharmic recovery screen with restart options.
// ════════════════════════════════════════════════════════════════
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform,
} from 'react-native';
import { router } from 'expo-router';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console — in production integrate with Sentry / Bugsnag here
    console.error('[ErrorBoundary] Caught error:', error?.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      router.replace('/(tabs)');
    } catch {
      try { router.replace('/login'); } catch { /* last resort — user must restart */ }
    }
  };

  handleGoLogin = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      router.replace('/login');
    } catch { /* ignore */ }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = __DEV__;
    const errorMsg = this.state.error?.message || 'Unknown error';

    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Dharmic top */}
          <Text style={s.om}>🕉</Text>
          <Text style={s.title}>क्षमा करें / Something went wrong</Text>
          <Text style={s.sub}>
            एक अप्रत्याशित त्रुटि आई।{'\n'}
            An unexpected error occurred.
          </Text>

          {/* Shlok */}
          <View style={s.shlokBox}>
            <Text style={s.shlokSan}>
              नैनं छिद्रन्ति शस्त्राणि नैनं दहति पावकः।
            </Text>
            <Text style={s.shlokMeaning}>
              The soul cannot be harmed. This too shall pass. 🙏
            </Text>
            <Text style={s.shlokRef}>— Bhagavad Gita 2.23</Text>
          </View>

          {/* Error details in dev only */}
          {isDev && (
            <View style={s.devBox}>
              <Text style={s.devLabel}>DEV — Error Details:</Text>
              <Text style={s.devMsg}>{errorMsg}</Text>
              {this.state.errorInfo?.componentStack ? (
                <Text style={s.devStack} numberOfLines={8}>
                  {this.state.errorInfo.componentStack}
                </Text>
              ) : null}
            </View>
          )}

          {/* Recovery buttons */}
          <TouchableOpacity style={s.primaryBtn} onPress={this.handleRestart} activeOpacity={0.85}>
            <Text style={s.primaryBtnTxt}>🏠 Return Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={this.handleGoLogin} activeOpacity={0.85}>
            <Text style={s.secondaryBtnTxt}>↩ Go to Login</Text>
          </TouchableOpacity>

          <Text style={s.helpTxt}>
            अगर समस्या बनी रहे तो App को पुनः प्रारंभ करें।{'\n'}
            If the problem persists, please restart the app.
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0500',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
  },
  om: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F4A261',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(253,246,237,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  shlokBox: {
    backgroundColor: 'rgba(107,33,168,0.14)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(107,33,168,0.3)',
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  shlokSan: {
    fontSize: 15,
    color: '#D4A8FF',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '600',
    marginBottom: 10,
  },
  shlokMeaning: {
    fontSize: 13,
    color: 'rgba(253,246,237,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  shlokRef: {
    fontSize: 11,
    color: '#E8620A',
    fontWeight: '700',
  },
  devBox: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.3)',
    marginBottom: 24,
    width: '100%',
  },
  devLabel: {
    fontSize: 11,
    color: '#E74C3C',
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  devMsg: {
    fontSize: 12,
    color: 'rgba(231,76,60,0.9)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 6,
  },
  devStack: {
    fontSize: 10,
    color: 'rgba(231,76,60,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  primaryBtn: {
    backgroundColor: '#E8620A',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    elevation: 4,
    shadowColor: '#E8620A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  primaryBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(200,130,40,0.3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryBtnTxt: {
    color: '#F4A261',
    fontSize: 14,
    fontWeight: '700',
  },
  helpTxt: {
    fontSize: 11,
    color: 'rgba(253,246,237,0.25)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
