const handleCanvasClickForTrace = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAdminMode || !isDrawingMode || !viewerInstanceRef.current?.mouseEventToCoords) return;
    if ((e.target as HTMLElement).closest('[data-toolbar="true"]')) return;

    const coords = viewerInstanceRef.current.mouseEventToCoords(e.nativeEvent);
    if (!coords || coords.length < 2) return;

    const pt: SphericalPoint = {
      pitch: Number(coords[0].toFixed(2)),
      yaw: Number(coords[1].toFixed(2)),
    };

    // Esto acumula puntos libremente sin cerrarse a los 4 clics
    setDraftPoints((prev) => [...prev, pt]);
  };
