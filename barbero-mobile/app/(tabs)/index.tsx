
import { StyleSheet, Text, View} from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { Colors } from "@/constants/colors";
export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>B</Text>
        </View>

        <Text style={styles.brand}>BARBERO</Text>

      <AppText variant="title" style={styles.title}>
        Top barbers{"\n"}zero friction
      </AppText>

      <AppText variant="body" color={Colors.textSecondary}>
  Book a trusted barber near you.
  Quality grooming, made simple.
</AppText>

<AppButton
  title="Get Started"
  onPress={() => alert("Get Started")}
/>

<View style={{ height: 12 }} />

<AppButton
  title="Log In"
  variant="secondary"
  onPress={() => alert("Log In")}
/>
      


        <Text style={styles.footer}>
          GOOD LOOKS. NO HASSLE.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  content: {
    alignItems: "center",
  },

  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#243B53",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  logoText: {
    fontSize: 42,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  brand: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 5,
    color: "#243B53",
    marginBottom: 42,
  },

  title: {
    fontSize: 28,
    lineHeight: 44,
    fontWeight: "700",
    color: "#243B53",
    textAlign: "center",
    marginBottom: 16,
  },

  description: {
    fontSize: 16,
    lineHeight: 25,
    color: "#627D98",
    textAlign: "center",
    maxWidth: 290,
    marginBottom: 36,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#243B53",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    width: "100%",
    backgroundColor: "#F0F4F8",
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#243B53",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 3,
    color: "#829AB1",
    marginTop: 48,
  },
});
