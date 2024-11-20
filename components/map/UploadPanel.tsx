import React, { useCallback, useState, useEffect } from "react";
import { parse } from "papaparse";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MenuIcon, UploadIcon } from "lucide-react";
import { GeoJSONFeature, UploadPanelProps } from "./types";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useMapContext } from "../context/MapContext";
import LayerPanel from './LayerPanel';

const UploadPanel: React.FC<UploadPanelProps> = () => {
  const { toast } = useToast();
  const { updateFeatures, layers, toggleLayerVisibility, deleteLayer } = useMapContext();

  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedLat, setSelectedLat] = useState<string | null>(null);
  const [selectedLng, setSelectedLng] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);



  const processFile = useCallback((file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'geojson' || fileExtension === 'json') {
      console.log('Parsing GeoJSON file:', file);

      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          if (jsonData.type === 'FeatureCollection' && Array.isArray(jsonData.features)) {
            updateFeatures(jsonData.features, file.name);
            toast({
              title: "Success",
              description: `Loaded ${jsonData.features.length} features from GeoJSON`,
            });
          } else if (jsonData.type === 'Feature') {
            updateFeatures([jsonData], file.name);
            toast({
              title: "Success",
              description: "Loaded 1 feature from GeoJSON",
            });
          } else {
            throw new Error('Invalid GeoJSON format');
          }
        } catch (error) {
          console.error('Error parsing GeoJSON:', error);
          toast({
            title: "Error",
            description: "Failed to parse GeoJSON file",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'csv') {
      console.log('Parsing CSV file:', file);

      parse(file, {
        header: true,
        complete: (result) => {
          const parsedData = result.data as Record<string, unknown>[];
          if (parsedData.length > 0) {
            console.log('Parsed CSV data:', parsedData);
            setHeaders(Object.keys(parsedData[0]));
            setCsvData(parsedData);
            setDialogOpen(true);
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file",
            variant: "destructive",
          });
        }
      });
    } else {
      toast({
        title: "Error",
        description: "Unsupported file type",
        variant: "destructive",
      });
    }
  }, [updateFeatures, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFieldSelection = () => {
    if (selectedLat && selectedLng && selectedName) {
      const processedData = csvData.map((row) => {
        if (!row[selectedLat] || !row[selectedLng]) return null;
        const lat = parseFloat(row[selectedLat] as string);
        const lng = parseFloat(row[selectedLng] as string);

        // Check if lat and lng are valid numbers
        if (isNaN(lat) || isNaN(lng)) {
          // Show error toast using shadcn UI
          toast({
            title: "Invalid Coordinates",
            description: `Invalid LngLat object: (${lat}, ${lng}) found in the data.`,
          });
          return null; 
        }

        // Combine all other columns into a single content string
        const content = headers
          .filter(
            (header) =>
              header !== selectedLat &&
              header !== selectedLng &&
              header !== selectedName
          )
          .map((header) => `${header}: ${row[header]}`)
          .join(", ");

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number]
          },
          properties: {
            name: row[selectedName] || "point",
            description: content
          },
          name: row[selectedName] as string || "point",
        };
      });

      // Filter out any null values from invalid rows
      const validData = processedData.filter((data) => data !== null);
      if (validData.length > 0) {
        updateFeatures(validData, 'CSV Data');
      }
      setDialogOpen(false); // Close dialog after processing
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      {/* <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="icon">
            <MenuIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="m-2">
          <DropdownMenuItem
            onClick={() => {console.log("test")}}
            className="cursor-pointer"
          >
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu> */}
      
      <Button
        variant="default"
        size="icon"
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <UploadIcon className="h-4 w-4" />
      </Button>

      <input
        id="file-input"
        type="file"
        accept=".csv,.geojson,.json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button style={{ display: "none" }}>Open Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          className="bg-primary"
          aria-describedby="alert-dialog-description"
        >
          <AlertDialogTitle>Edit</AlertDialogTitle>
          <AlertDialogHeader>
            <h2>Select Fields</h2>
            <p>Please select the fields for Latitude, Longitude, and Name.</p>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <label>Latitude</label>
              <Select
                value={selectedLat ?? ""}
                onValueChange={(value) => setSelectedLat(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label>Longitude:</label>
              <Select
                value={selectedLng ?? ""}
                onValueChange={(value) => setSelectedLng(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label>Name:</label>
              <Select
                value={selectedName ?? ""}
                onValueChange={(value) => setSelectedName(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleFieldSelection}>
              Process Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LayerPanel 
        layers={layers}
        onToggleLayer={toggleLayerVisibility}
        onDeleteLayer={deleteLayer}
      />
    </div>
  );
};

export default UploadPanel;
