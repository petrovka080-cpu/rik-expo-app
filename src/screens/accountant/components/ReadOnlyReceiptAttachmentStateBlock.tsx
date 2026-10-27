import { Text, View } from "react-native";

type AttachmentStateBlockProps = {
  tone: "error" | "warning";
  title: string;
  message: string;
};

export function AttachmentStateBlock(props: AttachmentStateBlockProps) {
  const palette =
    props.tone === "error"
      ? {
          borderColor: "rgba(255,120,120,0.35)",
          backgroundColor: "rgba(120,0,0,0.18)",
          color: "#FFD2D2",
        }
      : {
          borderColor: "rgba(253,224,71,0.35)",
          backgroundColor: "rgba(120,90,0,0.16)",
          color: "#FDE68A",
        };

  return (
    <View
      style={{
        marginBottom: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.borderColor,
        backgroundColor: palette.backgroundColor,
      }}
    >
      <Text style={{ color: palette.color, fontWeight: "900" }}>{props.title}</Text>
      <Text style={{ color: palette.color, marginTop: 4 }}>{props.message}</Text>
    </View>
  );
}
