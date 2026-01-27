export default function Loading() {
  return (
    <div className="flex justify-center items-center h-screen w-full bg-bg-page transition-colors duration-300">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary font-bold text-xs">
          SC
        </div>
      </div>
    </div>
  );
}
