/** @format */
export default function BackgroundDecoration() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e8eef5_1px,transparent_1px),linear-gradient(to_bottom,#e8eef5_1px,transparent_1px)] bg-[size:64px_64px] opacity-80" />
      <div className="absolute -left-32 top-32 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="absolute -right-32 bottom-24 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
    </>
  );
}
