import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkUpdateList } from './MarkUpdateList';
import { DriveRequestList } from './DriveRequestList';

export function RequestsView() {
  return (
    <div className="flex flex-col h-full bg-white">
        <div className="h-16 border-b flex items-center px-6 justify-between bg-white shrink-0 z-10">
             <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 text-lg">
                    Student Requests
                </h3>
             </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
            <Tabs defaultValue="mark_updates" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="mark_updates">Mark Updates</TabsTrigger>
                    <TabsTrigger value="drive_requests">Drive Requests</TabsTrigger>
                </TabsList>
                <div className="flex-1 mt-4">
                    <TabsContent value="mark_updates" className="m-0">
                        <MarkUpdateList />
                    </TabsContent>
                    <TabsContent value="drive_requests" className="m-0">
                        <DriveRequestList />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    </div>
  );
}
