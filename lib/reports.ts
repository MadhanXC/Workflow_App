import { Task } from "@/types/task";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

export type ReportPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

interface ReportOptions {
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
  includeCompleted?: boolean;
  includeInProgress?: boolean;
  includeNotStarted?: boolean;
  includeProjects?: boolean;
  includeJobs?: boolean;
  includePriceDetails?: boolean;
  selectedTasks?: string[];
}

function getDefaultDateRange(period: ReportPeriod, date: Date = new Date()) {
  switch (period) {
    case "daily":
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };
    case "weekly":
      return {
        start: startOfWeek(date),
        end: endOfWeek(date),
      };
    case "monthly":
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    case "quarterly":
      return {
        start: startOfQuarter(date),
        end: endOfQuarter(date),
      };
    case "yearly":
      return {
        start: startOfYear(date),
        end: endOfYear(date),
      };
  }
}

function formatPrice(price: number | null): string {
  return price !== null ? `$${price.toFixed(2)}` : "-";
}

export function generatePDFReport(tasks: Task[], options: ReportOptions) {
  // Create PDF in landscape letter size (11 x 8.5 inches)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: "letter",
    putOnlyUsedFonts: true,
    compress: true,
  });

  // Get date range
  let dateRange;
  if (options.startDate && options.endDate) {
    dateRange = {
      start: startOfDay(options.startDate),
      end: endOfDay(options.endDate),
    };
  } else if (options.period === "daily") {
    dateRange = getDefaultDateRange("daily");
  }

  // Add title
  const title = options.selectedTasks
    ? "Custom Data Report"
    : `Work Tasks Report - ${
        options.period.charAt(0).toUpperCase() + options.period.slice(1)
      }`;
  doc.setFontSize(16);
  doc.text(title, 0.5, 0.75);

  // Add report info
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), "PPP")}`, 0.5, 1);

  // Add date range if available
  let startY = 1.5;
  if (dateRange && !options.selectedTasks) {
    doc.text(
      `Period: ${format(dateRange.start, "PPP")} to ${format(
        dateRange.end,
        "PPP"
      )}`,
      0.5,
      1.25
    );
    startY = 1.75;
  }

  // Filter tasks based on options
  let filteredTasks = tasks;

  // If specific tasks are selected, use only those
  if (options.selectedTasks) {
    filteredTasks = tasks.filter((task) =>
      options.selectedTasks?.includes(task.id)
    );
  } else {
    // Date range filter
    if (dateRange) {
      filteredTasks = filteredTasks.filter((task) => {
        const taskDate = task.createdAt;
        return taskDate >= dateRange.start && taskDate <= dateRange.end;
      });
    }

    // Status filters
    const statusFilters = {
      completed: options.includeCompleted ?? true,
      "in-progress": options.includeInProgress ?? true,
      "not-initiated": options.includeNotStarted ?? true,
    };

    // Type filters
    const typeFilters = {
      project: options.includeProjects ?? true,
      job: options.includeJobs ?? true,
    };

    filteredTasks = filteredTasks.filter(
      (task) => statusFilters[task.status] && typeFilters[task.type]
    );
  }

  // Sort tasks by date
  filteredTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Prepare table headers and data
  const headers = [
    "Title",
    "Site",
    "Type",
    "Status",
    "Priority",
    "Work Status",
    "PO Number",
    "Created",
    "Started",
    "Completed",
  ];

  if (options.includePriceDetails) {
    headers.push("Quoted Price", "Confirmed Price");
  }

  // Prepare table data
  const tableData = filteredTasks.map((task) => {
    const row = [
      task.title,
      task.site,
      task.type,
      task.status.replace(/-/g, " "),
      task.priority || "medium",
      task.workConfirmationStatus === "awaiting"
        ? "Awaiting Confirmation"
        : "Confirmed",
      task.poNumber || "-",
      format(task.createdAt, "PP"),
      task.dateInitiated ? format(task.dateInitiated, "PP") : "-",
      task.dateCompleted ? format(task.dateCompleted, "PP") : "-",
    ];

    if (options.includePriceDetails) {
      row.push(formatPrice(task.quotedPrice), formatPrice(task.confirmedPrice));
    }

    return row;
  });

  // Configure column widths for landscape mode
  const columnStyles = options.includePriceDetails
    ? {
        0: { cellWidth: 1.2 }, // Title
        1: { cellWidth: 1.2 }, // Site
        2: { cellWidth: 0.6 }, // Type
        3: { cellWidth: 0.7 }, // Status
        4: { cellWidth: 0.6 }, // Priority
        5: { cellWidth: 0.8 }, // Work Status
        6: { cellWidth: 0.7 }, // PO Number
        7: { cellWidth: 0.7 }, // Created
        8: { cellWidth: 0.7 }, // Started
        9: { cellWidth: 0.7 }, // Completed
        10: { cellWidth: 0.7 }, // Quoted Price
        11: { cellWidth: 0.7 }, // Confirmed Price
      }
    : {
        0: { cellWidth: 1.8 }, // Title
        1: { cellWidth: 1.8 }, // Site
        2: { cellWidth: 0.7 }, // Type
        3: { cellWidth: 0.9 }, // Status
        4: { cellWidth: 0.7 }, // Priority
        5: { cellWidth: 1.1 }, // Work Status
        6: { cellWidth: 0.9 }, // PO Number
        7: { cellWidth: 0.8 }, // Created
        8: { cellWidth: 0.8 }, // Started
        9: { cellWidth: 0.8 }, // Completed
      };

  // Add table
  (doc as any).autoTable({
    head: [headers],
    body: tableData,
    startY,
    styles: {
      fontSize: 8,
      cellPadding: 0.05,
      overflow: "linebreak",
      lineWidth: 0.01,
    },
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles,
    pageBreak: "auto",
    margin: { top: 2.0, right: 0.5, left: 0.5, bottom: 2.0 },
    theme: "grid",
  });

  // Add summary
  const summaryY = (doc as any).lastAutoTable.finalY + 0.5;

  const totalTasks = filteredTasks.length;
  const completed = filteredTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const inProgress = filteredTasks.filter(
    (t) => t.status === "in-progress"
  ).length;
  const notStarted = filteredTasks.filter(
    (t) => t.status === "not-initiated"
  ).length;
  const projects = filteredTasks.filter((t) => t.type === "project").length;
  const jobs = filteredTasks.filter((t) => t.type === "job").length;

  const urgent = filteredTasks.filter((t) => t.priority === "urgent").length;
  const high = filteredTasks.filter((t) => t.priority === "high").length;
  const medium = filteredTasks.filter((t) => t.priority === "medium").length;
  const low = filteredTasks.filter((t) => t.priority === "low").length;

  const confirmedWork = filteredTasks.filter(
    (t) => t.workConfirmationStatus === "confirmed"
  ).length;
  const awaitingConfirmation = filteredTasks.filter(
    (t) => t.workConfirmationStatus === "awaiting"
  ).length;
  const withPO = filteredTasks.filter((t) => t.poNumber).length;

  // Calculate column positions for landscape mode
  const margin = 0.5;
  const colWidth = (10 - 2 * margin) / 4;

  const col1X = margin;
  const col2X = margin + colWidth;
  const col3X = margin + 2 * colWidth;
  const col4X = margin + 3 * colWidth;

  // Summary Section with Price Summary
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  const summaryLabel = "Summary:";
  doc.text(summaryLabel, col1X, summaryY);
  doc.setFont(undefined, "normal");

  // Add total tasks and price summary on the same line
  const totalTasksText = `Total Tasks: ${totalTasks}`;
  const summaryLabelWidth = doc.getTextWidth(summaryLabel);
  const totalTasksX = col1X + summaryLabelWidth + 0.1; // Add small gap after "Summary:"
  doc.text(totalTasksText, totalTasksX, summaryY);

  if (options.includePriceDetails) {
    const totalQuoted = filteredTasks.reduce(
      (sum, task) => sum + (task.quotedPrice || 0),
      0
    );
    const totalConfirmed = filteredTasks.reduce(
      (sum, task) => sum + (task.confirmedPrice || 0),
      0
    );

    const totalTasksWidth = doc.getTextWidth(totalTasksText);
    const priceSummaryX = totalTasksX + totalTasksWidth + 0.2; // Add gap after total tasks

    doc.setFont(undefined, "bold");
    const priceSummaryLabel = "Price Summary:";
    doc.text(priceSummaryLabel, priceSummaryX, summaryY);

    doc.setFont(undefined, "normal");
    const priceSummaryLabelWidth = doc.getTextWidth(priceSummaryLabel);
    const priceDetailsX = priceSummaryX + priceSummaryLabelWidth + 0.1; // Add small gap after label

    // Format price summary with proper spacing
    const quotedPriceText = `Quoted Price: ${formatPrice(totalQuoted)}`;
    const confirmedPriceText = `Confirmed Price: ${formatPrice(
      totalConfirmed
    )}`;

    doc.text(quotedPriceText, priceDetailsX, summaryY);
    doc.text(
      confirmedPriceText,
      priceDetailsX + doc.getTextWidth(quotedPriceText) + 0.2,
      summaryY
    );
  }

  // Status Summary
  doc.setFont(undefined, "bold");
  doc.text("Status Distribution:", col1X, summaryY + 0.5);
  doc.setFont(undefined, "normal");
  doc.text(`• Completed: ${completed}`, col1X + 0.25, summaryY + 0.75);
  doc.text(`• In Progress: ${inProgress}`, col1X + 0.25, summaryY + 1);
  doc.text(`• Not Started: ${notStarted}`, col1X + 0.25, summaryY + 1.25);

  // Type Summary
  doc.setFont(undefined, "bold");
  doc.text("Type Distribution:", col2X, summaryY + 0.5);
  doc.setFont(undefined, "normal");
  doc.text(`• Projects: ${projects}`, col2X + 0.25, summaryY + 0.75);
  doc.text(`• Jobs: ${jobs}`, col2X + 0.25, summaryY + 1);

  // Priority Summary
  doc.setFont(undefined, "bold");
  doc.text("Priority Distribution:", col3X, summaryY + 0.5);
  doc.setFont(undefined, "normal");
  doc.text(`• Urgent: ${urgent}`, col3X + 0.25, summaryY + 0.75);
  doc.text(`• High: ${high}`, col3X + 0.25, summaryY + 1);
  doc.text(`• Medium: ${medium}`, col3X + 0.25, summaryY + 1.25);
  doc.text(`• Low: ${low}`, col3X + 0.25, summaryY + 1.5);

  // Work Confirmation Summary
  doc.setFont(undefined, "bold");
  doc.text("Work Confirmation:", col4X, summaryY + 0.5);
  doc.setFont(undefined, "normal");
  doc.text(`• Confirmed: ${confirmedWork}`, col4X + 0.25, summaryY + 0.75);
  doc.text(`• Awaiting: ${awaitingConfirmation}`, col4X + 0.25, summaryY + 1);
  doc.text(`• With PO: ${withPO}`, col4X + 0.25, summaryY + 1.25);

  return doc;
}

export function generateExcelReport(tasks: Task[], options: ReportOptions) {
  // Get date range
  let dateRange;
  if (options.startDate && options.endDate) {
    dateRange = {
      start: startOfDay(options.startDate),
      end: endOfDay(options.endDate),
    };
  } else if (options.period === "daily") {
    dateRange = getDefaultDateRange("daily");
  }

  // Filter tasks based on options
  let filteredTasks = tasks;

  // If specific tasks are selected, use only those
  if (options.selectedTasks) {
    filteredTasks = tasks.filter((task) =>
      options.selectedTasks?.includes(task.id)
    );
  } else {
    // Date range filter
    if (dateRange) {
      filteredTasks = filteredTasks.filter((task) => {
        const taskDate = task.createdAt;
        return taskDate >= dateRange.start && taskDate <= dateRange.end;
      });
    }

    // Status filters
    const statusFilters = {
      completed: options.includeCompleted ?? true,
      "in-progress": options.includeInProgress ?? true,
      "not-initiated": options.includeNotStarted ?? true,
    };

    // Type filters
    const typeFilters = {
      project: options.includeProjects ?? true,
      job: options.includeJobs ?? true,
    };

    filteredTasks = filteredTasks.filter(
      (task) => statusFilters[task.status] && typeFilters[task.type]
    );
  }

  // Sort tasks by date
  filteredTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Prepare data for Excel
  const data = filteredTasks.map((task) => {
    const baseData = {
      Title: task.title,
      Site: task.site,
      Type: task.type,
      Status: task.status.replace(/-/g, " "),
      Priority: task.priority || "medium",
      "Work Status":
        task.workConfirmationStatus === "awaiting"
          ? "Awaiting Confirmation"
          : "Confirmed",
      "PO Number": task.poNumber || "",
      Description: task.description,
      Notes: task.notes || "",
      Created: format(task.createdAt, "PP"),
      Updated: format(task.updatedAt, "PP"),
      "Date Initiated": task.dateInitiated
        ? format(task.dateInitiated, "PP")
        : "",
      "Date Completed": task.dateCompleted
        ? format(task.dateCompleted, "PP")
        : "",
      Source: task.source,
      "Requires Material": task.requiresMaterial ? "Yes" : "No",
      "Material Status": task.materialStatus
        ? task.materialStatus.replace(/-/g, " ")
        : "",
      "Material Description": task.materialDescription || "",
    };

    if (options.includePriceDetails) {
      return {
        ...baseData,
        "Quoted Price": task.quotedPrice !== null ? task.quotedPrice : "",
        "Confirmed Price":
          task.confirmedPrice !== null ? task.confirmedPrice : "",
      };
    }

    return baseData;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();

  // Add main data worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Tasks");

  // Add summary worksheet
  const totalTasks = filteredTasks.length;
  const completed = filteredTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const inProgress = filteredTasks.filter(
    (t) => t.status === "in-progress"
  ).length;
  const notStarted = filteredTasks.filter(
    (t) => t.status === "not-initiated"
  ).length;
  const projects = filteredTasks.filter((t) => t.type === "project").length;
  const jobs = filteredTasks.filter((t) => t.type === "job").length;

  const urgent = filteredTasks.filter((t) => t.priority === "urgent").length;
  const high = filteredTasks.filter((t) => t.priority === "high").length;
  const medium = filteredTasks.filter((t) => t.priority === "medium").length;
  const low = filteredTasks.filter((t) => t.priority === "low").length;

  const confirmedWork = filteredTasks.filter(
    (t) => t.workConfirmationStatus === "confirmed"
  ).length;
  const awaitingConfirmation = filteredTasks.filter(
    (t) => t.workConfirmationStatus === "awaiting"
  ).length;
  const withPO = filteredTasks.filter((t) => t.poNumber).length;

  const summaryData = [
    ["Report Summary"],
    ["Generated On", format(new Date(), "PPP")],
    [
      "Period",
      dateRange
        ? `${format(dateRange.start, "PPP")} to ${format(dateRange.end, "PPP")}`
        : "All Time",
    ],
    [""],
    ["Total Tasks", totalTasks],
    [""],
    ["Status Distribution"],
    ["Completed", completed],
    ["In Progress", inProgress],
    ["Not Started", notStarted],
    [""],
    ["Type Distribution"],
    ["Projects", projects],
    ["Jobs", jobs],
    [""],
    ["Priority Distribution"],
    ["Urgent", urgent],
    ["High", high],
    ["Medium", medium],
    ["Low", low],
    [""],
    ["Work Confirmation"],
    ["Confirmed", confirmedWork],
    ["Awaiting Confirmation", awaitingConfirmation],
    ["With PO", withPO],
  ];

  if (options.includePriceDetails) {
    const totalQuoted = filteredTasks.reduce(
      (sum, task) => sum + (task.quotedPrice || 0),
      0
    );
    const totalConfirmed = filteredTasks.reduce(
      (sum, task) => sum + (task.confirmedPrice || 0),
      0
    );

    summaryData.push(
      [""],
      ["Price Summary"],
      ["Total Quoted", totalQuoted],
      ["Total Confirmed", totalConfirmed]
    );
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Generate buffer
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return excelBuffer;
}
