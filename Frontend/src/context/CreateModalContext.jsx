import React, { createContext, useCallback, useContext, useState } from "react";
import CreateContentModal from "@/components/model/CreateContentModal";

const CreateModalContext = createContext(null);

/**
 * Hook to access the create-content modal from any page/component.
 *
 * @returns {{ openCreate: (type?: 'post'|'vibe'|'story') => void }}
 */
export function useCreateModal() {
  const ctx = useContext(CreateModalContext);
  if (!ctx) {
    throw new Error("useCreateModal must be used within <CreateModalProvider>");
  }
  return ctx;
}

/**
 * Provider that renders the CreateContentModal once and exposes
 * `openCreate(type)` to any descendant via context.
 */
export function CreateModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [defaultType, setDefaultType] = useState("post");

  const openCreate = useCallback((type = "post") => {
    setDefaultType(type);
    setIsOpen(true);
  }, []);

  const closeCreate = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <CreateModalContext.Provider value={{ openCreate }}>
      {children}

      <CreateContentModal
        isOpen={isOpen}
        defaultType={defaultType}
        onClose={closeCreate}
        onCreatedSuccess={closeCreate}
      />
    </CreateModalContext.Provider>
  );
}
