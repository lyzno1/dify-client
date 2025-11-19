import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatArea } from "@/components/chat/chat-area";

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="w-[300px] hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea />
      </div>
    </div>
  );
}
