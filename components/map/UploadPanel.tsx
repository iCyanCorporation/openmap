import React, { useCallback, useState, useEffect } from "react";
import { parse } from "papaparse";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MenuIcon, UploadIcon } from "lucide-react";
import { GeoJSONFeature, UploadPanelProps } from "@/components/type/types";

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

import { useMapContext } from "../context/MapContext";

const UploadPanel: React.FC<UploadPanelProps> = () => {
  const { toast } = useToast();
  const { updateFeatures, layers, toggleLayerVisibility, deleteLayer } = useMapContext();

  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedLat, setSelectedLat] = useState<string | null>(null);
  const [selectedLng, setSelectedLng] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const latitude_list = ["latitude", "lat", "緯度"];
  const longitude_list = ["longitude", "lng", "lon", "経度"];

  const findColumnByList = (headers: string[], possibleNames: string[]) => {
    return headers.find(header => 
      possibleNames.some(name => header.toLowerCase().includes(name.toLowerCase()))
    );
  };

  const processFile = useCallback((file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'geojson' || fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const geojson = JSON.parse(e.target?.result as string);
          if (geojson.type === 'FeatureCollection') {
            updateFeatures(geojson.features, 'places');
            toast({
              title: "Success",
              description: "GeoJSON file uploaded successfully",
            });
          } else {
            toast({
              title: "Error",
              description: "Invalid GeoJSON format",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to parse GeoJSON file",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'csv') {
      parse(file, {
        complete: (results) => {
          const headers = results.meta.fields || [];
          // Auto-detect lat/lon columns
          const latColumn = findColumnByList(headers, latitude_list);
          const lngColumn = findColumnByList(headers, longitude_list);
          
          if (latColumn && lngColumn) {
            setSelectedLat(latColumn);
            setSelectedLng(lngColumn);
          }
          setCsvData(results.data as Record<string, unknown>[]);
          setHeaders(headers);
          setDialogOpen(true);
        },
        header: true,
      });
    } else {
      toast({
        title: "Error",
        description: "Unsupported file format",
        variant: "destructive",
      });
    }
  }, [toast, updateFeatures]);

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

        // Combine all other columns into a object
        const content = Object.fromEntries(
          headers
            .filter(
              (header) =>
                header !== selectedLat &&
                header !== selectedLng &&
                header !== selectedName
            )
            .map((header) => [header, row[header]])
        );

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [lng, lat] as [number, number]
          },
          properties: {
            name: row[selectedName] || "point",
            ...content
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
    <div className="">      
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
          className=""
          aria-describedby="alert-dialog-description"
        >
          <AlertDialogTitle>Add Data</AlertDialogTitle>
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

      
    </div>
  );
};

export default UploadPanel;
