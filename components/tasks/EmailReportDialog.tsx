"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendReportEmail } from "@/lib/email";

interface EmailReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBuffer?: Buffer;
  excelBuffer?: Buffer;
  reportName: string;
}

export function EmailReportDialog({
  isOpen,
  onOpenChange,
  pdfBuffer,
  excelBuffer,
  reportName
}: EmailReportDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sendPdf, setSendPdf] = useState(true);
  const [sendExcel, setSendExcel] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address",
      });
      return;
    }

    if (!sendPdf && !sendExcel) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one file format",
      });
      return;
    }

    setIsSending(true);

    try {
      const attachments = [];

      if (sendPdf && pdfBuffer) {
        attachments.push({
          filename: `${reportName}.pdf`,
          content: pdfBuffer
        });
      }

      if (sendExcel && excelBuffer) {
        attachments.push({
          filename: `${reportName}.xlsx`,
          content: excelBuffer
        });
      }

      await sendReportEmail(
        email,
        `Task Report - ${new Date().toLocaleDateString()}`,
        attachments
      );

      toast({
        title: "Success",
        description: "Report sent successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send report. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Report via Email</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter recipient's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <Label>File Formats</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pdf"
                  checked={sendPdf}
                  onCheckedChange={(checked) => setSendPdf(checked as boolean)}
                  disabled={!pdfBuffer}
                />
                <Label htmlFor="pdf">PDF Format</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="excel"
                  checked={sendExcel}
                  onCheckedChange={(checked) => setSendExcel(checked as boolean)}
                  disabled={!excelBuffer}
                />
                <Label htmlFor="excel">Excel Format</Label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || (!sendPdf && !sendExcel)}
            className="w-full mt-4"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}