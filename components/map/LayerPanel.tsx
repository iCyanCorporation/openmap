"use client"

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayersIcon, Trash2Icon, GripVertical } from "lucide-react";
import { useMapContext } from "../context/MapContext";
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface LayerPanelProps {}

interface SortableItemProps {
  id: string;
  name: string;
  dataLength: number;
  visible: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

interface BaseMapProps {
  id: string;
  url: string;
  name: string;
}

const SortableItem = ({ id, name, dataLength, visible, onToggle, onDelete }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between space-x-4 border-b p-4 bg-background"
    >
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="cursor-grab" 
          {...attributes} 
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="text-sm text-muted-foreground">
            {dataLength} features
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={visible}
          onCheckedChange={() => onToggle(id)}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
};

const LayerPanel: React.FC<LayerPanelProps> = () => {
  const { updateFeatures, layers, toggleLayerVisibility, deleteLayer, updateLayersOrder } = useMapContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedBaseMap, setSelectedBaseMap] = React.useState<string[]>(["test1"]);

  const baseMaps : BaseMapProps[] = [
    { id: "1", url: "https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png", name: "色別標高図" },
    // 洪水浸水想定区域（想定最大規模）_国管理河川
    { id: "2", url: "https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_kuni_data/{z}/{x}/{y}.png", name: "洪水浸水想定区域" },
    // -------- 津波浸水想定 
    // 全国
    { id: "3", url: "https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png", name: "津波浸水想定" },
    // -------- 土砂災害警戒区域（土石流） 
    // 全国
    { id: "4", url: "https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png", name: "土石流警戒区域" 
  }
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex(item => item.id === active.id);
      const newIndex = layers.findIndex(item => item.id === over.id);
      
      const newLayers = arrayMove(layers, oldIndex, newIndex);
      updateLayersOrder(newLayers);
    }
  }
  
  return (
    <div className=''>
      <Button
        variant="default"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LayersIcon className="h-4 w-4" />
      </Button>

      {isOpen && (
        <Card className="w-[300px] p-0 mt-1">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <LayersIcon className="h-5 w-5" />
              <CardTitle>Layers</CardTitle>
            </div>
          </CardHeader>
          <CardContent className='space-y-2'>
          <ScrollArea className="">
          <h2 className='font-semibold leading-none tracking-tight py-2'>Base Maps</h2>
            <ToggleGroup 
              type="multiple" 
              value={selectedBaseMap}
              onValueChange={(value: string[]) => {
                setSelectedBaseMap(value);
                console.log("Selected base map:", value);
              }}
              className="grid grid-cols-3 gap-2"
            >
              {baseMaps.map((item: BaseMapProps) => (
                <ToggleGroupItem 
                  key={item.id} 
                  value={item.id} 
                  aria-label={item.name}
                  className="w-full h-auto aspect-square data-[state=on]:bg-accent data-[state=on]:border-gray-800 border border-gray-200 rounded-md"
                >
                  {item.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            </ScrollArea>

            <ScrollArea className="pt-2">
              <h2 className='font-semibold leading-none tracking-tight py-2'>Other</h2>
              {layers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No layers uploaded yet
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={layers.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-0">
                      {layers.map((layer) => (
                        <SortableItem
                          key={layer.id}
                          id={layer.id}
                          name={layer.name}
                          dataLength={layer.data.length}
                          visible={layer.visible}
                          onToggle={toggleLayerVisibility}
                          onDelete={deleteLayer}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LayerPanel;
