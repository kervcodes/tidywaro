import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import UploadScreen from "./src/screens/UploadScreen";
import ClosetScreen from "./src/screens/ClosetScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "closet">("upload");

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.container}
        edges={["top", "left", "right", "bottom"]}
      >
        <View style={styles.content}>
          {activeTab === "upload" ? <UploadScreen /> : <ClosetScreen />}
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "upload" && styles.activeTab]}
            onPress={() => setActiveTab("upload")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "upload" && styles.activeTabText,
              ]}
            >
              Upload
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "closet" && styles.activeTab]}
            onPress={() => setActiveTab("closet")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "closet" && styles.activeTabText,
              ]}
            >
              Closet
            </Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#0000ff",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#0000ff",
    fontWeight: "bold",
  },
});
