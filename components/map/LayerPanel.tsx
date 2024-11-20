"use client"

import React, { useCallback, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayersIcon, Trash2Icon, GripVertical } from "lucide-react";
import { useMapContext } from "../context/MapContext";
import { baseMaps, BaseMapProps } from "@/config/baseMaps";
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

interface LayerPanelProps {}

interface SortableItemProps {
  id: string;
  name: string;
  dataLength: number;
  visible: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
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
  const { updateFeatures, layers, toggleLayerVisibility, deleteLayer, updateLayersOrder, map } = useMapContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedBaseMap, setSelectedBaseMap] = React.useState<string[]>(["test1"]);
  const [layerOpacities, setLayerOpacities] = React.useState<{ [key: string]: number }>(
    Object.fromEntries(baseMaps.map(item => [item.id, 0.7]))
  );

  const handleOpacityChange = useCallback((id: string, opacity: number) => {
    if (!map) return;
    
    const layerId = `layer-${id}`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'raster-opacity', opacity);
      setLayerOpacities(prev => ({ ...prev, [id]: opacity }));
    }
  }, [map]);


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleBaseMapChange = useCallback((value: string[]) => {
    if (!map) return;

    const removedLayers = selectedBaseMap.filter(id => !value.includes(id));
    const addedLayers = value.filter(id => !selectedBaseMap.includes(id));

    removedLayers.forEach(id => {
      const layerId = `layer-${id}`;
      const sourceId = `source-${id}`;
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    addedLayers.forEach(id => {
      const baseMap = baseMaps.find(item => item.id === id);
      if (!baseMap) return;

      const sourceId = `source-${id}`;
      const layerId = `layer-${id}`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [baseMap.url],
          tileSize: 256,
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': layerOpacities[id]
          }
        });
      }
    });

    setSelectedBaseMap(value);
  }, [map, selectedBaseMap, layerOpacities]);

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
        <h2 className='font-semibold leading-none tracking-tight py-2'>Information</h2>
          <div className="space-y-4">
            {baseMaps.map((item: BaseMapProps) => (
              <div 
                key={item.id}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.name}</span>
                  <Switch
                    checked={selectedBaseMap.includes(item.id)}
                    onCheckedChange={(checked) => {
                      const newValue = checked 
                        ? [...selectedBaseMap, item.id]
                        : selectedBaseMap.filter(id => id !== item.id);
                      handleBaseMapChange(newValue);
                    }}
                    aria-label={item.name}
                  />
                </div>
                {selectedBaseMap.includes(item.id) && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Opacity</span>
                      <span className="text-xs text-muted-foreground">{Math.round(layerOpacities[item.id] * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={layerOpacities[item.id]}
                      onChange={(e) => handleOpacityChange(item.id, parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
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
