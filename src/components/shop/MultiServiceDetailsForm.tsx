import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, User, Mail, Phone, MapPin, Wifi, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const customerDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(8, "Phone number too short").max(20, "Phone number too long"),
  address: z.string().trim().min(5, "Address is required").max(200, "Address too long"),
  city: z.string().trim().min(2, "City is required").max(100, "City too long"),
  state: z.string().trim().min(2, "State is required").max(50, "State too long"),
  postcode: z.string().trim().min(4, "Postcode is required").max(10, "Postcode too long"),
});

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

export interface ServiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  requiresDetails: boolean;
}

export interface ServiceDetailsResult {
  itemId: string;
  productId: string;
  productName: string;
  quantity: number;
  customerDetails: CustomerDetails | null;
}

interface MultiServiceDetailsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (results: ServiceDetailsResult[]) => void;
  services: ServiceItem[];
  loading?: boolean;
  defaultValues?: Partial<CustomerDetails>;
}

const emptyDetails: CustomerDetails = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "NSW",
  postcode: "",
};

export const MultiServiceDetailsForm = ({
  open,
  onOpenChange,
  onSubmit,
  services,
  loading = false,
  defaultValues = {},
}: MultiServiceDetailsFormProps) => {
  // Filter to only services that require details
  const servicesNeedingDetails = services.filter(s => s.requiresDetails);
  const totalSteps = servicesNeedingDetails.length;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [allDetails, setAllDetails] = useState<Map<string, CustomerDetails>>(new Map());
  const [formData, setFormData] = useState<CustomerDetails>({
    ...emptyDetails,
    ...defaultValues,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setAllDetails(new Map());
      setFormData({
        ...emptyDetails,
        ...defaultValues,
      });
      setErrors({});
    }
  }, [open, defaultValues]);

  const currentService = servicesNeedingDetails[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 100;

  const handleChange = (field: keyof CustomerDetails, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateCurrentForm = (): CustomerDetails | null => {
    const result = customerDetailsSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return null;
    }

    return result.data;
  };

  const handleNext = () => {
    const validatedData = validateCurrentForm();
    if (!validatedData) return;

    // Save current details
    const newDetails = new Map(allDetails);
    newDetails.set(currentService.id, validatedData);
    setAllDetails(newDetails);

    if (isLastStep) {
      // Build final results
      const results: ServiceDetailsResult[] = services.map(service => ({
        itemId: service.id,
        productId: service.productId,
        productName: service.productName,
        quantity: service.quantity,
        customerDetails: newDetails.get(service.id) || null,
      }));
      onSubmit(results);
    } else {
      // Move to next step
      setCurrentStep(currentStep + 1);
      // Load saved data for next service or reset with defaults
      const nextService = servicesNeedingDetails[currentStep + 1];
      const savedData = newDetails.get(nextService.id);
      setFormData(savedData || { ...emptyDetails, ...defaultValues });
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // Save current data before going back
      const validatedData = validateCurrentForm();
      if (validatedData) {
        const newDetails = new Map(allDetails);
        newDetails.set(currentService.id, validatedData);
        setAllDetails(newDetails);
      }
      
      // Go back and load previous data
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      const prevService = servicesNeedingDetails[prevStep];
      const savedData = allDetails.get(prevService.id);
      setFormData(savedData || { ...emptyDetails, ...defaultValues });
      setErrors({});
    }
  };

  const handleCopyFromPrevious = () => {
    if (currentStep > 0) {
      const prevService = servicesNeedingDetails[currentStep - 1];
      const prevData = allDetails.get(prevService.id);
      if (prevData) {
        setFormData({ ...prevData });
        setErrors({});
      }
    }
  };

  // If no services need details, just submit immediately
  if (totalSteps === 0 && open) {
    const results: ServiceDetailsResult[] = services.map(service => ({
      itemId: service.id,
      productId: service.productId,
      productName: service.productName,
      quantity: service.quantity,
      customerDetails: null,
    }));
    onSubmit(results);
    return null;
  }

  if (!currentService) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {currentStep + 1} of {totalSteps}
            </Badge>
            {totalSteps > 1 && (
              <Progress value={progress} className="flex-1 h-2" />
            )}
          </div>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Service Details Required
          </DialogTitle>
          <DialogDescription>
            Enter the installation address for <strong>{currentService.productName}</strong>
            {currentService.quantity > 1 && ` (${currentService.quantity}x)`}
          </DialogDescription>
        </DialogHeader>

        {currentStep > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyFromPrevious}
            className="w-fit text-xs"
          >
            Copy details from previous service
          </Button>
        )}

        <div className="space-y-4 py-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="John"
                className={errors.firstName ? "border-destructive" : ""}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Smith"
                className={errors.lastName ? "border-destructive" : ""}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Contact Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="john@example.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="0412 345 678"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Street Address *
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street"
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address}</p>
            )}
          </div>

          {/* City, State, Postcode */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Sydney"
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="NSW"
                className={errors.state ? "border-destructive" : ""}
              />
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode *</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleChange("postcode", e.target.value)}
                placeholder="2000"
                className={errors.postcode ? "border-destructive" : ""}
              />
              {errors.postcode && (
                <p className="text-xs text-destructive">{errors.postcode}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
          <Button onClick={handleNext} disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Continue to Payment
              </>
            ) : (
              <>
                Next Service
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};