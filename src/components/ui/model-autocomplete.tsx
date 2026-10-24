import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { devicePricesApi } from '@/db/api';
import type { DeviceCategory } from '@/types/types';

interface ModelAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  category?: DeviceCategory;
  brand?: string;
  placeholder?: string;
  id?: string;
}

export function ModelAutocomplete({
  value,
  onChange,
  category,
  brand,
  placeholder = 'Enter model number',
  id
}: ModelAutocompleteProps) {
  const [models, setModels] = useState<string[]>([]);
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load unique models from database
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      try {
        const uniqueModels = await devicePricesApi.getUniqueModels(category, brand);
        setModels(uniqueModels);
      } catch (error) {
        console.error('Error loading models:', error);
        setModels([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [category, brand]);

  // Filter models based on input value
  useEffect(() => {
    if (!value || value.trim() === '') {
      setFilteredModels(models);
    } else {
      const searchTerm = value.toLowerCase();
      const filtered = models.filter(model =>
        model.toLowerCase().includes(searchTerm)
      );
      setFilteredModels(filtered);
    }
  }, [value, models]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowDropdown(true);
  };

  const handleInputFocus = () => {
    if (models.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleSelect = (selectedModel: string) => {
    onChange(selectedModel);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        className="w-full"
        autoComplete="off"
      />
      {showDropdown && filteredModels.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading models...</div>
          ) : filteredModels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No models found.</div>
          ) : (
            <div className="py-1">
              {filteredModels.map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleSelect(model)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                    value === model && 'bg-accent text-accent-foreground'
                  )}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
