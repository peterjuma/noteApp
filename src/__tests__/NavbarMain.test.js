import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import NavbarMain from "../NavbarMain";

// Mock useMarkDown and DOMPurify
jest.mock("../useMarkDown", () => ({
  md2html: { render: (text) => `<p>${text}</p>` },
}));

const mockNote = {
  noteid: "123",
  notetitle: "Test Note",
  notebody: "This is **test** content",
  action: "updatenote",
};

const defaultProps = {
  display: true,
  notesData: mockNote,
  handleEditNoteBtn: jest.fn(),
  handleDeleteNote: jest.fn(),
  handleMoveNote: jest.fn(),
  handleCopyEvent: jest.fn(),
  handleDownloadNote: jest.fn(),
  onShowHistory: jest.fn(),
};

describe("NavbarMain", () => {
  test("renders nothing when display is false", () => {
    const { container } = render(<NavbarMain {...defaultProps} display={false} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders toolbar when display is true", () => {
    render(<NavbarMain {...defaultProps} />);
    expect(screen.getByLabelText("Note actions")).toBeInTheDocument();
  });

  test("renders Copy button", () => {
    render(<NavbarMain {...defaultProps} />);
    expect(screen.getByLabelText("Copy note")).toBeInTheDocument();
  });

  test("renders Edit button", () => {
    render(<NavbarMain {...defaultProps} />);
    expect(screen.getByLabelText("Edit this note")).toBeInTheDocument();
  });

  test("Edit button calls handleEditNoteBtn", () => {
    render(<NavbarMain {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Edit this note"));
    expect(defaultProps.handleEditNoteBtn).toHaveBeenCalled();
  });

  test("Delete button calls handleDeleteNote", () => {
    render(<NavbarMain {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("Delete"));
    expect(defaultProps.handleDeleteNote).toHaveBeenCalled();
  });

  test("Version History button calls onShowHistory", () => {
    render(<NavbarMain {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("Version History"));
    expect(defaultProps.onShowHistory).toHaveBeenCalled();
  });

  test("Download button calls handleDownloadNote", () => {
    render(<NavbarMain {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("More actions"));
    fireEvent.click(screen.getByText("Download Markdown"));
    expect(defaultProps.handleDownloadNote).toHaveBeenCalledWith(mockNote);
  });
});
