import { FloatBox } from "@mohsensami/float-box";

export default function App() {
  return (
    <div className="h-screen w-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">🎉 FloatBox Test</h1>

      <FloatBox
        title="Note"
        initialPosition={{ x: 100, y: 120 }}
        initialSize={{ width: 400, height: 300 }}
        minSize={{ width: 250, height: 150 }}
        onClose={() => alert("بسته شد")}
        onFocus={() => console.log("فوکوس شد")}
        className="rounded-xl"
      >
        <p className="mb-2">This is a Float Box.</p>
        <p>You Can Float me or Drag me 👆</p>
      </FloatBox>

      <FloatBox
        title="Chat Box"
        initialPosition={{ x: 250, y: 200 }}
        initialSize={{ width: 320, height: 220 }}
      >
        <div className="space-y-2">
          <p className="text-sm">👤 Hi! How are you?</p>
          <p className="text-sm text-blue-600"> I'm fine 🙌</p>
        </div>
      </FloatBox>
    </div>
  );
}
