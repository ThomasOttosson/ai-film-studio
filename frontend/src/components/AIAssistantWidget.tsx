import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FiCheck,
  FiMaximize2,
  FiMessageCircle,
  FiMinimize2,
  FiMove,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  sendAiAssistantMessage,
  type AiAssistantChangeProposal,
  type AiAssistantChatMessage,
} from "../api/aiAssistantApi";
import type { SavedProjectData } from "../utils/projectStorage";
import "./AIAssistantWidget.css";

interface AIAssistantWidgetProps {
  projectId: string;
  projectName: string;
  projectData: SavedProjectData;
  canApplyChanges: boolean;
  onApplyChange: (
    projectData: SavedProjectData
  ) => void;
  onRegenerateScene: (
    sceneId: number
  ) => Promise<void>;
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposal?: AiAssistantChangeProposal | null;
  proposalStatus?: "pending" | "applied" | "discarded";
  affectedSceneIds?: number[];
  regeneratingSceneId?: number | null;
  regeneratedSceneIds?: number[];
}

interface WidgetPosition {
  x: number;
  y: number;
}

const POSITION_STORAGE_KEY =
  "ai-film-studio-assistant-position";

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 560;
const BUTTON_SIZE = 58;
const SCREEN_MARGIN = 16;
const DRAG_THRESHOLD = 5;

const quickPrompts = [
  "Suggest improvements for my story",
  "Make the story more cinematic",
  "Improve the pacing",
  "Suggest a stronger ending",
];

function createMessageId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getDefaultPosition(): WidgetPosition {
  if (typeof window === "undefined") {
    return {
      x: SCREEN_MARGIN,
      y: SCREEN_MARGIN,
    };
  }

  return {
    x: Math.max(
      window.innerWidth -
        BUTTON_SIZE -
        SCREEN_MARGIN,
      SCREEN_MARGIN
    ),
    y: Math.max(
      window.innerHeight -
        BUTTON_SIZE -
        SCREEN_MARGIN,
      SCREEN_MARGIN
    ),
  };
}

function clampPosition(
  position: WidgetPosition,
  width = BUTTON_SIZE,
  height = BUTTON_SIZE
): WidgetPosition {
  if (typeof window === "undefined") {
    return position;
  }

  const maxX = Math.max(
    SCREEN_MARGIN,
    window.innerWidth - width - SCREEN_MARGIN
  );

  const maxY = Math.max(
    SCREEN_MARGIN,
    window.innerHeight - height - SCREEN_MARGIN
  );

  return {
    x: Math.min(
      Math.max(position.x, SCREEN_MARGIN),
      maxX
    ),
    y: Math.min(
      Math.max(position.y, SCREEN_MARGIN),
      maxY
    ),
  };
}

function readStoredPosition(): WidgetPosition {
  if (typeof window === "undefined") {
    return getDefaultPosition();
  }

  try {
    const storedPosition = window.localStorage.getItem(
      POSITION_STORAGE_KEY
    );

    if (!storedPosition) {
      return getDefaultPosition();
    }

    const parsedPosition = JSON.parse(
      storedPosition
    ) as Partial<WidgetPosition>;

    if (
      typeof parsedPosition.x !== "number" ||
      typeof parsedPosition.y !== "number"
    ) {
      return getDefaultPosition();
    }

    return clampPosition({
      x: parsedPosition.x,
      y: parsedPosition.y,
    });
  } catch {
    return getDefaultPosition();
  }
}

function getVisuallyChangedSceneIds(
  currentProjectData: SavedProjectData,
  proposedProjectData: SavedProjectData
) {
  const globalVisualSettingsChanged =
    currentProjectData.style !==
      proposedProjectData.style ||
    currentProjectData.aspectRatio !==
      proposedProjectData.aspectRatio;

  return proposedProjectData.scenes
    .filter((proposedScene) => {
      const currentScene =
        currentProjectData.scenes.find(
          (scene) => scene.id === proposedScene.id
        );

      if (!currentScene) {
        return false;
      }

      const sceneVisualsChanged =
        currentScene.title !==
          proposedScene.title ||
        currentScene.mood !==
          proposedScene.mood ||
        currentScene.imagePrompt !==
          proposedScene.imagePrompt ||
        currentScene.videoPrompt !==
          proposedScene.videoPrompt;

      const hasGeneratedVisualMedia =
        Boolean(currentScene.imageUrl) ||
        Boolean(currentScene.videoUrl);

      return (
        hasGeneratedVisualMedia &&
        (globalVisualSettingsChanged ||
          sceneVisualsChanged)
      );
    })
    .map((scene) => scene.id);
}

function getInitialMessage(): AssistantMessage {
  return {
    id: createMessageId(),
    role: "assistant",
    content:
      "Hi! I can help improve your story, scenes, narration and prompts. Ask for advice, or tell me what you want changed.",
    proposal: null,
  };
}

function AIAssistantWidget({
  projectId,
  projectName,
  projectData,
  canApplyChanges,
  onApplyChange,
  onRegenerateScene,
}: AIAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const [position, setPosition] =
    useState<WidgetPosition>(() =>
      readStoredPosition()
    );

  const [messages, setMessages] = useState<
    AssistantMessage[]
  >([getInitialMessage()]);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const dragStateRef = useRef<{
    pointerId: number;
    startPointerX: number;
    startPointerY: number;
    startWidgetX: number;
    startWidgetY: number;
    moved: boolean;
  } | null>(null);

  const shouldIgnoreClickRef = useRef(false);

  const assistantHistory =
    useMemo<AiAssistantChatMessage[]>(
      () =>
        messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      [messages]
    );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    function handleResize() {
      setPosition((currentPosition) =>
        clampPosition(currentPosition)
      );
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        POSITION_STORAGE_KEY,
        JSON.stringify(position)
      );
    } catch {
      // The widget still works if localStorage is unavailable.
    }
  }, [position]);

  useEffect(() => {
    setMessages([getInitialMessage()]);
    setInputValue("");
    setError("");
    setIsLoading(false);
  }, [projectId]);

  function toggleWidget() {
    if (shouldIgnoreClickRef.current) {
      shouldIgnoreClickRef.current = false;
      return;
    }

    setIsOpen((current) => !current);
    setIsMinimized(false);
    setError("");
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    dragStateRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startWidgetX: position.x,
      startWidgetY: position.y,
      moved: false,
    };
  }

  function handlePointerMove(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const dragState = dragStateRef.current;

    if (
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX =
      event.clientX - dragState.startPointerX;

    const deltaY =
      event.clientY - dragState.startPointerY;

    if (
      Math.abs(deltaX) > DRAG_THRESHOLD ||
      Math.abs(deltaY) > DRAG_THRESHOLD
    ) {
      dragState.moved = true;
    }

    setPosition(
      clampPosition({
        x: dragState.startWidgetX + deltaX,
        y: dragState.startWidgetY + deltaY,
      })
    );
  }

  function handlePointerEnd(
    event: ReactPointerEvent<HTMLButtonElement>
  ) {
    const dragState = dragStateRef.current;

    if (
      !dragState ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    shouldIgnoreClickRef.current =
      dragState.moved;

    dragStateRef.current = null;
  }

  function handleButtonClick(
    event: ReactMouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    toggleWidget();
  }

  async function submitMessage(message: string) {
    const cleanMessage = message.trim();

    if (
      !cleanMessage ||
      isLoading ||
      !projectId
    ) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: createMessageId(),
      role: "user",
      content: cleanMessage,
      proposal: null,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

    setInputValue("");
    setError("");
    setIsLoading(true);

    try {
      const response =
        await sendAiAssistantMessage({
          projectId,
          message: cleanMessage,
          history: [
            ...assistantHistory,
            {
              role: "user",
              content: cleanMessage,
            },
          ],
          project: {
            name: projectName,
            data: projectData,
          },
        });

      const affectedSceneIds =
        response.proposal
          ? getVisuallyChangedSceneIds(
              projectData,
              response.proposal.projectData
            )
          : [];

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.reply,
          proposal: response.proposal,
          proposalStatus: response.proposal
            ? "pending"
            : undefined,
          affectedSceneIds,
          regeneratingSceneId: null,
          regeneratedSceneIds: [],
        },
      ]);
    } catch (requestError) {
      console.error(
        "Failed to send AI assistant message:",
        requestError
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "The AI assistant could not respond."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void submitMessage(inputValue);
  }

  function handleClearChat() {
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content:
          "Chat cleared. What would you like help with?",
        proposal: null,
      },
    ]);

    setError("");
  }

  function handleApplyProposal(
    messageId: string,
    proposal: AiAssistantChangeProposal
  ) {
    if (!canApplyChanges) {
      setError(
        "You need Owner or Editor access to apply project changes."
      );
      return;
    }

    onApplyChange(proposal.projectData);

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              proposalStatus: "applied",
            }
          : message
      )
    );

    setError("");
  }

  async function handleRegenerateScene(
    messageId: string,
    sceneId: number
  ) {
    if (!canApplyChanges) {
      setError(
        "You need Owner or Editor access to regenerate scene media."
      );
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              regeneratingSceneId: sceneId,
            }
          : message
      )
    );

    setError("");

    try {
      await onRegenerateScene(sceneId);

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                regeneratingSceneId: null,
                regeneratedSceneIds: [
                  ...(message.regeneratedSceneIds ??
                    []),
                  sceneId,
                ].filter(
                  (value, index, values) =>
                    values.indexOf(value) ===
                    index
                ),
              }
            : message
        )
      );
    } catch (regenerationError) {
      console.error(
        "Failed to regenerate scene media:",
        regenerationError
      );

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                regeneratingSceneId: null,
              }
            : message
        )
      );

      setError(
        regenerationError instanceof Error
          ? regenerationError.message
          : "The scene media could not be regenerated."
      );
    }
  }

  function handleDiscardProposal(
    messageId: string
  ) {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              proposalStatus: "discarded",
            }
          : message
      )
    );
  }

  const panelPosition = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        left: position.x,
        top: position.y,
      };
    }

    const desiredLeft = position.x;
    const desiredTop =
      position.y -
      (isMinimized ? 74 : PANEL_HEIGHT) -
      12;

    const panelWidth = Math.min(
      PANEL_WIDTH,
      window.innerWidth - SCREEN_MARGIN * 2
    );

    const panelHeight = isMinimized
      ? 74
      : Math.min(
          PANEL_HEIGHT,
          window.innerHeight -
            SCREEN_MARGIN * 2
        );

    return clampPosition(
      {
        x: desiredLeft,
        y: desiredTop,
      },
      panelWidth,
      panelHeight
    );
  }, [position, isMinimized]);

  const panelStyle = {
    left: `${panelPosition.x}px`,
    top: `${panelPosition.y}px`,
  };

  const buttonStyle = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  return (
    <>
      {isOpen && (
        <aside
          className={`ai-assistant-panel${
            isMinimized
              ? " ai-assistant-panel--minimized"
              : ""
          }`}
          style={panelStyle}
          aria-label="AI assistant"
        >
          <header className="ai-assistant-panel__header">
            <div className="ai-assistant-panel__identity">
              <span className="ai-assistant-panel__icon">
                ✦
              </span>

              <div>
                <strong>AI Assistant</strong>

                {!isMinimized && (
                  <span>
                    {projectName ||
                      "Current project"}
                  </span>
                )}
              </div>
            </div>

            <div className="ai-assistant-panel__header-actions">
              {!isMinimized && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  aria-label="Clear AI assistant chat"
                  title="Clear chat"
                >
                  <FiTrash2 />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setIsMinimized(
                    (current) => !current
                  )
                }
                aria-label={
                  isMinimized
                    ? "Expand AI assistant"
                    : "Minimize AI assistant"
                }
                title={
                  isMinimized
                    ? "Expand"
                    : "Minimize"
                }
              >
                {isMinimized ? (
                  <FiMaximize2 />
                ) : (
                  <FiMinimize2 />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI assistant"
                title="Close"
              >
                <FiX />
              </button>
            </div>
          </header>

          {!isMinimized && (
            <>
              <div className="ai-assistant-panel__messages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`ai-assistant-message ai-assistant-message--${message.role}`}
                  >
                    <span>
                      {message.role ===
                      "assistant"
                        ? "✦"
                        : "You"}
                    </span>

                    <div className="ai-assistant-message__body">
                      <p>{message.content}</p>

                      {message.proposal && (
                        <div
                          className={`ai-assistant-proposal ai-assistant-proposal--${
                            message.proposalStatus ??
                            "pending"
                          }`}
                        >
                          <div className="ai-assistant-proposal__heading">
                            <strong>
                              Proposed change
                            </strong>

                            {message.proposalStatus ===
                              "applied" && (
                              <span>
                                <FiCheck />
                                Applied
                              </span>
                            )}

                            {message.proposalStatus ===
                              "discarded" && (
                              <span>
                                Discarded
                              </span>
                            )}
                          </div>

                          <p>
                            {message.proposal.summary}
                          </p>

                          {message.proposalStatus ===
                            "applied" &&
                            (message.affectedSceneIds
                              ?.length ?? 0) > 0 && (
                              <div className="ai-assistant-regeneration">
                                <strong>
                                  Regenerate visual media
                                </strong>

                                <p>
                                  Existing images and videos do not update automatically.
                                </p>

                                <div className="ai-assistant-regeneration__actions">
                                  {message.affectedSceneIds?.map(
                                    (sceneId) => {
                                      const isRegenerating =
                                        message.regeneratingSceneId ===
                                        sceneId;

                                      const isRegenerated =
                                        message.regeneratedSceneIds?.includes(
                                          sceneId
                                        );

                                      return (
                                        <button
                                          type="button"
                                          key={sceneId}
                                          onClick={() =>
                                            void handleRegenerateScene(
                                              message.id,
                                              sceneId
                                            )
                                          }
                                          disabled={
                                            !canApplyChanges ||
                                            isRegenerating ||
                                            isRegenerated ||
                                            message.regeneratingSceneId !==
                                              null &&
                                            message.regeneratingSceneId !==
                                              undefined
                                          }
                                        >
                                          {isRegenerating
                                            ? `Regenerating Scene ${sceneId}...`
                                            : isRegenerated
                                              ? `Scene ${sceneId} regenerated`
                                              : `Regenerate Scene ${sceneId}`}
                                        </button>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}

                          {(message.proposalStatus ??
                            "pending") ===
                            "pending" && (
                            <div className="ai-assistant-proposal__actions">
                              <button
                                type="button"
                                className="ai-assistant-proposal__apply"
                                onClick={() =>
                                  handleApplyProposal(
                                    message.id,
                                    message.proposal as AiAssistantChangeProposal
                                  )
                                }
                                disabled={
                                  !canApplyChanges
                                }
                                title={
                                  canApplyChanges
                                    ? "Apply this change to the project"
                                    : "Owner or Editor access is required"
                                }
                              >
                                <FiCheck />
                                Apply change
                              </button>

                              <button
                                type="button"
                                className="ai-assistant-proposal__discard"
                                onClick={() =>
                                  handleDiscardProposal(
                                    message.id
                                  )
                                }
                              >
                                <FiX />
                                Discard
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="ai-assistant-message ai-assistant-message--assistant">
                    <span>✦</span>

                    <div
                      className="ai-assistant-typing"
                      role="status"
                      aria-label="AI assistant is writing"
                    >
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {messages.length <= 1 && (
                <div className="ai-assistant-panel__suggestions">
                  {quickPrompts.map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      onClick={() =>
                        void submitMessage(prompt)
                      }
                      disabled={isLoading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <div
                  className="ai-assistant-panel__error"
                  role="alert"
                >
                  <span>{error}</span>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    title="Dismiss error"
                  >
                    <FiX />
                  </button>
                </div>
              )}

              <form
                className="ai-assistant-panel__form"
                onSubmit={handleSubmit}
              >
                <textarea
                  value={inputValue}
                  onChange={(event) =>
                    setInputValue(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      if (
                        inputValue.trim() &&
                        !isLoading
                      ) {
                        void submitMessage(
                          inputValue
                        );
                      }
                    }
                  }}
                  placeholder="Ask about your story or request a change..."
                  rows={2}
                  disabled={
                    isLoading || !projectId
                  }
                />

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !projectId ||
                    !inputValue.trim()
                  }
                  aria-label="Send message"
                  title="Send"
                >
                  <FiSend />
                </button>
              </form>
            </>
          )}
        </aside>
      )}

      <button
        type="button"
        className={`ai-assistant-launcher${
          isOpen
            ? " ai-assistant-launcher--open"
            : ""
        }`}
        style={buttonStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleButtonClick}
        aria-label={
          isOpen
            ? "Close AI assistant"
            : "Open AI assistant"
        }
        title="Drag to move · Click to open"
      >
        <span className="ai-assistant-launcher__glow" />

        <span className="ai-assistant-launcher__icon">
          {isOpen ? (
            <FiMessageCircle />
          ) : (
            "✦"
          )}
        </span>

        <span className="ai-assistant-launcher__move">
          <FiMove />
        </span>
      </button>
    </>
  );
}

export default AIAssistantWidget;