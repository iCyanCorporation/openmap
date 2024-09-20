import React, { useState, useEffect } from "react";
import { parse } from "papaparse";
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
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { MenuIcon, UploadIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import "maplibre-gl/dist/maplibre-gl.css";

interface UploadPanelProps {
  onFileUpload: (data: Record<string, unknown>[]) => void;
}

const latitude_list = ["latitude", "lat", "緯度"];
const longitude_list = ["longitude", "lng", "lon", "経度"];

const UploadPanel: React.FC<UploadPanelProps> = ({ onFileUpload }) => {
  const { toast } = useToast();

  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedLat, setSelectedLat] = useState<string | null>(null);
  const [selectedLng, setSelectedLng] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      parse(uploadedFile, {
        header: true,
        complete: (result) => {
          const parsedData = result.data as Record<string, unknown>[];
          if (parsedData.length > 0) {
            setHeaders(Object.keys(parsedData[0]));
            setCsvData(parsedData);
            setDialogOpen(true); // Open dialog after successful file upload
          }
        },
      });
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
          lat,
          lng,
          name: row[selectedName],
          content: content,
        };
      });

      // Filter out any null values from invalid rows
      const validData = processedData.filter((data) => data !== null);
      if (validData.length > 0) {
        onFileUpload(validData as Record<string, unknown>[]);
      }
      setDialogOpen(false); // Close dialog after processing
    }
  };

  useEffect(() => {
    if (headers.length > 0) {
      const latHeader = headers.find((header) =>
        latitude_list.includes(header.toLowerCase())
      );
      const lngHeader = headers.find((header) =>
        longitude_list.includes(header.toLowerCase())
      );

      if (latHeader) {
        setSelectedLat(latHeader); // Automatically select latitude header
      }
      if (lngHeader) {
        setSelectedLng(lngHeader); // Automatically select longitude header
      }
    }
  }, [headers]);

  return (
    <div className="absolute z-10 p-1" >
      {/* Dropdown Menu with Menu Icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 bg-white flex w-10 h-10 items-center justify-center rounded-full shadow-md hover:opacity-90">
            <MenuIcon /> {/* Menu Icon */}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mx-1">
          {/* Upload CSV Menu Item */}
          <DropdownMenuItem
            onClick={() => document.getElementById("file-input")?.click()}
            className="cursor-pointer"
          >
            <UploadIcon className="mr-2" />
            Upload CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden File Input */}
      <input
        id="file-input"
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Alert Dialog for Field Selection */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button style={{ display: "none" }}>Open Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          className="bg-white"
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
    </div>
  );
};

export default UploadPanel;
