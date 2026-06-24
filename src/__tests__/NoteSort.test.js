import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NoteSort from "../NoteSort";

describe("NoteSort", () => {
  test("renders sort dropdown with default value", () => {
    render(<NoteSort handleSortNotes={jest.fn()} sortby="4" />);
    const select = screen.getByLabelText("Sort notes by");
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("4");
  });

  test("calls handleSortNotes when selection changes", () => {
    const handleSort = jest.fn();
    render(<NoteSort handleSortNotes={handleSort} sortby="4" />);
    fireEvent.change(screen.getByLabelText("Sort notes by"), { target: { value: "0" } });
    expect(handleSort).toHaveBeenCalledWith("0");
  });

  test("shows all sort options", () => {
    render(<NoteSort handleSortNotes={jest.fn()} sortby="4" />);
    expect(screen.getByText("Modified: Newest")).toBeInTheDocument();
    expect(screen.getByText("Title: A-Z")).toBeInTheDocument();
    expect(screen.getByText("Created: Newest")).toBeInTheDocument();
  });
});
