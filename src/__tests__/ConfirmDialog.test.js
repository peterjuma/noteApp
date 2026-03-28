import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConfirmDialog from "../ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    title: "Confirm Action",
    message: "Are you sure?",
    confirmText: "Delete",
    cancelText: "Cancel",
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  test("renders title and message", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  test("renders confirm and cancel buttons", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  test("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  test("calls onCancel when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  test("renders secondary button when provided", () => {
    render(<ConfirmDialog {...defaultProps} secondaryText="Save & Close" onSecondary={jest.fn()} />);
    expect(screen.getByText("Save & Close")).toBeInTheDocument();
  });

  test("calls onSecondary when secondary button is clicked", () => {
    const onSecondary = jest.fn();
    render(<ConfirmDialog {...defaultProps} secondaryText="Save" onSecondary={onSecondary} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onSecondary).toHaveBeenCalled();
  });
});
