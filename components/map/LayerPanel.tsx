"use client"

import React from 'react';
import { GeoJSONFeature } from './types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayersIcon, Trash2Icon } from "lucide-react";

interface LayerPanelProps {
  layers: { id: string; name: string; data: GeoJSONFeature[]; visible: boolean }[];
  onToggleLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ layers, onToggleLayer, onDeleteLayer }) => {
  return (
    <Card className="w-[300px] mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <LayersIcon className="h-5 w-5" />
          <CardTitle>Layers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {layers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No layers uploaded yet
            </p>
          ) : (
            <div className="space-y-4">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center justify-between space-x-4 rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{layer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {layer.data.length} features
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={layer.visible}
                      onCheckedChange={() => onToggleLayer(layer.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteLayer(layer.id)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LayerPanel;
