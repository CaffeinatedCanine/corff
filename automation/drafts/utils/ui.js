const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  LabelBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { getConfig } = require("../config");
const {
  formatDateInput,
  formatDetailedTimestampLabel,
  formatScheduleLabel,
  formatTimeInput,
  zonedDateTimeToUtcMs,
} = require("./time");

const DRAFT_KIND = {
  embed: "embed",
  post: "post",
};

const ALLOWED_TARGET_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
  ChannelType.GuildForum,
];

const MODAL_IDS = {
  createEmbed: "draft:create:embed",
  createPost: "draft:create:post",
  editEmbedPrefix: "draft:edit:embed:",
  editPostPrefix: "draft:edit:post:",
  schedulePrefix: "draft:schedule:",
  roleTagPrefix: "draft:roletag:",
  imagePrefix: "draft:image:",
};

const BUTTON_IDS = {
  postNowPrefix: "draft:post:",
  editPrefix: "draft:edit:",
  schedulePrefix: "draft:schedulebtn:",
  roleTagPrefix: "draft:roletagbtn:",
  imagePrefix: "draft:imagebtn:",
};

const FIELD_IDS = {
  title: "draft_title",
  inlineFields: "draft_inline_fields",
  body: "draft_body",
  color: "draft_color",
  footer: "draft_footer",
  postText: "draft_post_text",
  images: "draft_images",
  targetChannel: "draft_target_channel",
  mentionRole: "draft_mention_role",
  scheduleTimezone: "draft_schedule_timezone",
  scheduleDate: "draft_schedule_date",
  scheduleTime: "draft_schedule_time",
};

const MAX_INLINE_FIELDS = 12;
const MAX_IMAGES = 8;
const GALLERY_URL_BASE = "https://the-maker.gallery";
const INLINE_FIELDS_INPUT_MAX_LENGTH = 2000;
const POST_PREVIEW_SEPARATOR = "────────────────────────";
const COLOR_REFERENCE_URL = "https://htmlcolorcodes.com/";

const COMMON_SCHEDULE_TIMEZONES = [
  {
    label: "Stockholm",
    value: "Europe/Stockholm",
    description: "Central European Time",
  },
  { label: "London", value: "Europe/London", description: "UK time" },
  { label: "UTC", value: "UTC", description: "Coordinated Universal Time" },
  {
    label: "New York",
    value: "America/New_York",
    description: "US Eastern Time",
  },
  {
    label: "Chicago",
    value: "America/Chicago",
    description: "US Central Time",
  },
  { label: "Denver", value: "America/Denver", description: "US Mountain Time" },
  {
    label: "Los Angeles",
    value: "America/Los_Angeles",
    description: "US Pacific Time",
  },
  {
    label: "Toronto",
    value: "America/Toronto",
    description: "Canada Eastern Time",
  },
  {
    label: "Sydney",
    value: "Australia/Sydney",
    description: "Australia Eastern Time",
  },
  { label: "Tokyo", value: "Asia/Tokyo", description: "Japan Standard Time" },
];

function buildLengthLabel(label, value, maxLength) {
  return `${label} (${String(value || "").length}/${maxLength})`;
}

function parseInlineFieldLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_INLINE_FIELDS)
    .map((line) => {
      const separatorIndex = line.indexOf("|");
      if (separatorIndex === -1) {
        return { name: null, value: line };
      }

      const name = line.slice(0, separatorIndex).trim();
      const fieldValue = line.slice(separatorIndex + 1).trim();
      if (!fieldValue) {
        throw new Error(
          "Each inline field needs a value. Use `Label | Value` or just `Value`.",
        );
      }
      if (name.length > 256) {
        throw new Error("Inline field labels must be 256 characters or fewer.");
      }
      if (fieldValue.length > 1024) {
        throw new Error(
          "Each inline field value must be 1024 characters or fewer.",
        );
      }

      return {
        name: name || null,
        value: fieldValue,
      };
    });
}

function normalizeInlineFieldEntry(entry) {
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return {
      name: entry.name ? String(entry.name).trim() : null,
      value: String(entry.value || "").trim(),
    };
  }

  return {
    name: null,
    value: String(entry || "").trim(),
  };
}

function buildInlineFieldValue(lines) {
  return (lines || [])
    .slice(0, MAX_INLINE_FIELDS)
    .map((entry) => {
      const normalized = normalizeInlineFieldEntry(entry);
      return normalized.name
        ? `${normalized.name} | ${normalized.value}`
        : normalized.value;
    })
    .filter(Boolean)
    .join("\n");
}

function normalizeEmbedColorInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[\da-fA-F]{6}$/.test(hex)) {
    throw new Error(
      `Use a hex color like #877156. Color reference: ${COLOR_REFERENCE_URL}`,
    );
  }

  return `#${hex.toUpperCase()}`;
}

function resolveEmbedColor(value) {
  const normalized = normalizeEmbedColorInput(value);
  return normalized ? Number.parseInt(normalized.slice(1), 16) : 0x5865f2;
}

function getSelectedChannelId(collection) {
  if (!collection || collection.size === 0) {
    return null;
  }

  const first = collection.values().next().value;
  return first?.id || null;
}

function getSelectedRoleId(collection) {
  if (!collection || collection.size === 0) {
    return null;
  }

  const first = collection.values().next().value;
  return first?.id || null;
}

function resolveChannelName(guild, channelId) {
  if (!guild || !channelId) {
    return null;
  }

  return guild.channels?.cache?.get(channelId)?.name || null;
}

function buildPreviewHeader(draft) {
  return draft.kind === DRAFT_KIND.embed && draft.mentionRoleId
    ? `Role tag: <@&${draft.mentionRoleId}>`
    : null;
}

function buildPostPreviewContent(
  draft,
  previewHeader,
  { includeDivider = false } = {},
) {
  return [
    previewHeader,
    draft.payload.text,
    includeDivider ? POST_PREVIEW_SEPARATOR : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function getDraftImages(draft) {
  if (Array.isArray(draft.payload.images)) {
    return draft.payload.images;
  }

  return draft.payload.image ? [draft.payload.image] : [];
}

// Discord merges consecutive embeds that share the same `url` into one
// visual gallery block instead of stacking them as separate boxes.
function buildGalleryUrl(draft) {
  return `${GALLERY_URL_BASE}/${draft.id}`;
}

function buildGalleryEmbeds(draft) {
  const images = getDraftImages(draft);

  if (draft.kind === DRAFT_KIND.embed) {
    if (images.length <= 1) {
      return [];
    }
    const galleryUrl = buildGalleryUrl(draft);
    return images.map((url) =>
      new EmbedBuilder().setURL(galleryUrl).setImage(url),
    );
  }

  if (images.length <= 1) {
    return images.map((url) => new EmbedBuilder().setImage(url));
  }

  const galleryUrl = buildGalleryUrl(draft);
  return images.map((url) =>
    new EmbedBuilder().setURL(galleryUrl).setImage(url),
  );
}

function buildEmbedCard(draft, { includeFooter = true } = {}) {
  const embed = new EmbedBuilder().setColor(
    resolveEmbedColor(draft.payload.color),
  );

  if (draft.payload.title) {
    embed.setTitle(draft.payload.title);
  }

  if (draft.payload.body) {
    embed.setDescription(draft.payload.body);
  }

  if (draft.payload.inlineFields?.length) {
    embed.addFields(
      draft.payload.inlineFields
        .map((entry) => normalizeInlineFieldEntry(entry))
        .filter((entry) => entry.value)
        .map((entry) => ({
          name: entry.name || "\u200b",
          value: entry.value,
          inline: true,
        })),
    );
  }

  if (includeFooter && draft.payload.footer) {
    if (!draft.payload.body && !draft.payload.inlineFields?.length) {
      embed.setDescription("\u200b");
    }
    embed.setFooter({ text: draft.payload.footer });
  }

  const images = getDraftImages(draft);
  if (images.length === 1) {
    embed.setImage(images[0]);
  } else if (images.length > 1) {
    embed.setURL(buildGalleryUrl(draft));
  }

  return embed;
}

function buildEmbedModal(customId, initial = {}) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(initial.id ? "Edit Draft Embed" : "Create Draft Embed")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.color)
          .setLabel(buildLengthLabel("Accent Color", initial.color, 7))
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(7)
          .setPlaceholder("#877156")
          .setValue(initial.color || ""),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.title)
          .setLabel(buildLengthLabel("Title", initial.title, 256))
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setValue(initial.title || ""),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.body)
          .setLabel(buildLengthLabel("Text", initial.body, 4000))
          .setRequired(false)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setValue(initial.body || ""),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.inlineFields)
          .setLabel(
            buildLengthLabel(
              `Inline fields, ${MAX_INLINE_FIELDS} lines`,
              buildInlineFieldValue(initial.inlineFields),
              INLINE_FIELDS_INPUT_MAX_LENGTH,
            ),
          )
          .setRequired(false)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(INLINE_FIELDS_INPUT_MAX_LENGTH)
          .setPlaceholder(
            `One line per inline field, up to ${MAX_INLINE_FIELDS}. Optional: Label | Value`,
          )
          .setValue(buildInlineFieldValue(initial.inlineFields)),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.footer)
          .setLabel(buildLengthLabel("Footer", initial.footer, 2048))
          .setRequired(false)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(2048)
          .setValue(initial.footer || ""),
      ),
    );
}

function buildPostModal(customId, initial = {}) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(initial.id ? "Edit Draft Post" : "Create Draft Post")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.postText)
          .setLabel(buildLengthLabel("Text", initial.text, 2000))
          .setRequired(true)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000)
          .setValue(initial.text || ""),
      ),
    );
}

function buildScheduleModal(draft, guild) {
  const config = getConfig();
  const scheduledAt = Number.isFinite(draft?.scheduledAt)
    ? draft.scheduledAt
    : null;
  const scheduleTimezone = draft?.scheduleTimezone || config.timezone;
  const channelName = resolveChannelName(guild, draft?.targetChannelId);

  const targetChannelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(FIELD_IDS.targetChannel)
    .setPlaceholder("Select destination channel")
    .setRequired(true)
    .setMinValues(1)
    .setMaxValues(1)
    .addChannelTypes(...ALLOWED_TARGET_CHANNEL_TYPES);

  if (draft?.targetChannelId) {
    targetChannelSelect.setDefaultChannels(draft.targetChannelId);
  }

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(FIELD_IDS.mentionRole)
    .setPlaceholder("Optional role to tag above the post")
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(1);

  if (draft?.mentionRoleId) {
    roleSelect.setDefaultRoles(draft.mentionRoleId);
  }

  const timezoneSelect = new StringSelectMenuBuilder()
    .setCustomId(FIELD_IDS.scheduleTimezone)
    .setPlaceholder("Select schedule timezone")
    .setRequired(true)
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      COMMON_SCHEDULE_TIMEZONES.map((timezone) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(timezone.label)
          .setValue(timezone.value)
          .setDescription(timezone.description)
          .setDefault(timezone.value === scheduleTimezone),
      ),
    );

  const scheduleModal = new ModalBuilder()
    .setCustomId(`${MODAL_IDS.schedulePrefix}${draft.id}`)
    .setTitle("Schedule Draft")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Destination Channel")
        .setDescription(
          channelName ? `Current: #${channelName}` : "Current: unset",
        )
        .setChannelSelectMenuComponent(targetChannelSelect),
      new LabelBuilder()
        .setLabel("Timezone")
        .setDescription(`Current: ${scheduleTimezone}`)
        .setStringSelectMenuComponent(timezoneSelect),
    );

  if (draft.kind === DRAFT_KIND.embed) {
    scheduleModal.addLabelComponents(
      new LabelBuilder()
        .setLabel("Role Tag")
        .setDescription(
          draft?.mentionRoleId
            ? `Current: <@&${draft.mentionRoleId}>`
            : "Current: none",
        )
        .setRoleSelectMenuComponent(roleSelect),
    );
  }

  return scheduleModal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(FIELD_IDS.scheduleDate)
        .setLabel(`Date (${scheduleTimezone})`)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("2026-03-31")
        .setValue(
          scheduledAt ? formatDateInput(scheduledAt, scheduleTimezone) : "",
        ),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(FIELD_IDS.scheduleTime)
        .setLabel(`Time (${scheduleTimezone})`)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("18:00 or 6:00 PM")
        .setValue(
          scheduledAt ? formatTimeInput(scheduledAt, scheduleTimezone) : "",
        ),
    ),
  );
}

function buildRoleTagModal(draft) {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(FIELD_IDS.mentionRole)
    .setPlaceholder("Role to tag above this post")
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(1);

  if (draft.mentionRoleId) {
    roleSelect.setDefaultRoles(draft.mentionRoleId);
  }

  return new ModalBuilder()
    .setCustomId(`${MODAL_IDS.roleTagPrefix}${draft.id}`)
    .setTitle("Role Tag")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Role Tag")
        .setDescription(
          draft.mentionRoleId
            ? `Current: <@&${draft.mentionRoleId}>`
            : "Current: none",
        )
        .setRoleSelectMenuComponent(roleSelect),
    );
}

function parseRoleTagModal(interaction) {
  return getSelectedRoleId(
    interaction.fields.getSelectedRoles(FIELD_IDS.mentionRole, false),
  );
}

function buildImagesModal(draft) {
  const images = getDraftImages(draft);

  return new ModalBuilder()
    .setCustomId(`${MODAL_IDS.imagePrefix}${draft.id}`)
    .setTitle("Images")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(FIELD_IDS.images)
          .setLabel(`Image URLs, one per line, up to ${MAX_IMAGES}`)
          .setRequired(false)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setPlaceholder(
            "https://example.com/one.png\nhttps://example.com/two.png",
          )
          .setValue(images.join("\n")),
      ),
    );
}

function parseImagesModal(interaction) {
  const raw = String(
    interaction.fields.getTextInputValue(FIELD_IDS.images) || "",
  );
  const urls = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (urls.length > MAX_IMAGES) {
    throw new Error(`You can add at most ${MAX_IMAGES} images.`);
  }

  const invalid = urls.find((url) => !/^https?:\/\/\S+$/i.test(url));
  if (invalid) {
    throw new Error(`"${invalid}" is not a valid http(s) URL.`);
  }

  return urls;
}

function parseEmbedModal(interaction) {
  const title = String(
    interaction.fields.getTextInputValue(FIELD_IDS.title) || "",
  ).trim();
  const inlineFields = parseInlineFieldLines(
    interaction.fields.getTextInputValue(FIELD_IDS.inlineFields),
  );
  const body = String(
    interaction.fields.getTextInputValue(FIELD_IDS.body) || "",
  ).trim();
  const color = normalizeEmbedColorInput(
    interaction.fields.getTextInputValue(FIELD_IDS.color),
  );
  const footer = String(
    interaction.fields.getTextInputValue(FIELD_IDS.footer) || "",
  ).trim();

  if (!title && inlineFields.length === 0 && !body && !color && !footer) {
    throw new Error(
      "Add at least one embed field, body, title, accent color, or footer.",
    );
  }

  return {
    title: title || null,
    inlineFields,
    body: body || null,
    color,
    footer: footer || null,
  };
}

function parsePostModal(interaction) {
  const text = String(
    interaction.fields.getTextInputValue(FIELD_IDS.postText) || "",
  ).trim();
  if (!text) {
    throw new Error("Post text cannot be empty.");
  }

  return { text };
}

function parseScheduleModal(interaction, draft) {
  const config = getConfig();
  const targetChannelId = getSelectedChannelId(
    interaction.fields.getSelectedChannels(
      FIELD_IDS.targetChannel,
      true,
      ALLOWED_TARGET_CHANNEL_TYPES,
    ),
  );
  const mentionRoleId =
    draft?.kind === DRAFT_KIND.embed
      ? getSelectedRoleId(
          interaction.fields.getSelectedRoles(FIELD_IDS.mentionRole, false),
        )
      : null;
  const scheduleTimezone =
    interaction.fields.getStringSelectValues(FIELD_IDS.scheduleTimezone)?.[0] ||
    config.timezone;
  const dateText = String(
    interaction.fields.getTextInputValue(FIELD_IDS.scheduleDate) || "",
  ).trim();
  const timeText = String(
    interaction.fields.getTextInputValue(FIELD_IDS.scheduleTime) || "",
  ).trim();

  if (!dateText && !timeText) {
    return {
      mentionRoleId,
      targetChannelId,
      scheduleTimezone,
      scheduledAt: null,
    };
  }

  if (!dateText || !timeText) {
    throw new Error(
      "Provide both date and time, or leave both blank to clear the schedule.",
    );
  }

  const scheduledAt = zonedDateTimeToUtcMs(
    dateText,
    timeText,
    scheduleTimezone,
  );

  if (scheduledAt <= Date.now()) {
    throw new Error("Scheduled time must be in the future.");
  }

  return { mentionRoleId, targetChannelId, scheduleTimezone, scheduledAt };
}

function formatContributors(draft) {
  const editors = (draft.editorIds || []).filter(
    (userId) => userId && userId !== draft.creatorId,
  );

  if (editors.length === 0) {
    return `<@${draft.creatorId}>`;
  }

  return `<@${draft.creatorId}>\nUpdated by: ${editors.map((userId) => `<@${userId}>`).join(", ")}`;
}

function buildMetaEmbed(draft) {
  const config = getConfig();
  const scheduleTimezone = draft.scheduleTimezone || config.timezone;
  const statusText =
    draft.status === "posted"
      ? `Posted at ${formatDetailedTimestampLabel(draft.postedAt, scheduleTimezone)}`
      : draft.scheduledAt
        ? "Scheduled"
        : draft.targetChannelId
          ? "Ready to Post"
          : "Needs Destination";

  return new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle(`Draft ${draft.kind === DRAFT_KIND.embed ? "Embed" : "Post"}`)
    .addFields(
      {
        name: "Target Channel",
        value: draft.postedThreadId
          ? `<#${draft.postedThreadId}>`
          : draft.targetChannelId
            ? `<#${draft.targetChannelId}>`
            : "`Not selected yet`",
        inline: true,
      },
      ...(draft.kind === DRAFT_KIND.embed
        ? [
            {
              name: "Role Tag",
              value: draft.mentionRoleId
                ? `<@&${draft.mentionRoleId}>`
                : "`None`",
              inline: true,
            },
          ]
        : []),
      {
        name: "Scheduled",
        value: formatScheduleLabel(draft.scheduledAt, scheduleTimezone),
        inline: false,
      },
      {
        name: "Last Updated",
        value: formatDetailedTimestampLabel(draft.updatedAt, scheduleTimezone),
        inline: false,
      },
      {
        name: "Status",
        value: statusText,
        inline: true,
      },
      {
        name: "Created By",
        value: formatContributors(draft),
        inline: false,
      },
    );
}

function buildActionRow(draft) {
  const posted = draft.status === "posted";

  const buttons = [
    new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.postNowPrefix}${draft.id}`)
      .setLabel("Post Now")
      .setStyle(ButtonStyle.Success)
      .setDisabled(posted || !draft.targetChannelId),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.editPrefix}${draft.id}`)
      .setLabel(posted ? "Edit Live Post" : "Edit")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.schedulePrefix}${draft.id}`)
      .setLabel("Schedule")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(posted),
  ];

  const imageCount = getDraftImages(draft).length;
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`${BUTTON_IDS.imagePrefix}${draft.id}`)
      .setLabel(imageCount ? `Edit Images (${imageCount})` : "Add Images")
      .setStyle(ButtonStyle.Secondary),
  );

  if (posted && draft.kind === DRAFT_KIND.embed) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`${BUTTON_IDS.roleTagPrefix}${draft.id}`)
        .setLabel("Role Tag")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  return new ActionRowBuilder().addComponents(buttons);
}

function buildPreviewMessage(draft) {
  const previewHeader = buildPreviewHeader(draft);

  if (draft.kind === DRAFT_KIND.post) {
    return {
      content: buildPostPreviewContent(draft, previewHeader, {
        includeDivider: true,
      }),
      embeds: [...buildGalleryEmbeds(draft), buildMetaEmbed(draft)],
      components: [buildActionRow(draft)],
      allowedMentions: { parse: [] },
    };
  }

  return {
    content: previewHeader || undefined,
    embeds: [
      buildEmbedCard(draft, { includeFooter: true }),
      ...buildGalleryEmbeds(draft),
      buildMetaEmbed(draft),
    ],
    components: [buildActionRow(draft)],
    allowedMentions: { parse: [] },
  };
}

function buildDraftPostedEmbed(draft) {
  return buildEmbedCard(draft, { includeFooter: true });
}

function getPreviewChannelId(interaction) {
  return getConfig().modChannelId || interaction.channelId;
}

function buildCreateModal(kind) {
  if (kind === DRAFT_KIND.embed) {
    return buildEmbedModal(MODAL_IDS.createEmbed);
  }

  if (kind === DRAFT_KIND.post) {
    return buildPostModal(MODAL_IDS.createPost);
  }

  throw new Error("Unsupported draft type.");
}

function buildEditModal(draft) {
  if (draft.kind === DRAFT_KIND.embed) {
    return buildEmbedModal(`${MODAL_IDS.editEmbedPrefix}${draft.id}`, {
      id: draft.id,
      ...draft.payload,
    });
  }

  return buildPostModal(`${MODAL_IDS.editPostPrefix}${draft.id}`, {
    id: draft.id,
    ...draft.payload,
  });
}

function getCreateContext(customId) {
  if (customId === MODAL_IDS.createEmbed) {
    return {
      kind: DRAFT_KIND.embed,
    };
  }

  if (customId === MODAL_IDS.createPost) {
    return {
      kind: DRAFT_KIND.post,
    };
  }

  return null;
}

function getEditContext(customId) {
  if (customId.startsWith(MODAL_IDS.editEmbedPrefix)) {
    return {
      kind: DRAFT_KIND.embed,
      draftId: customId.slice(MODAL_IDS.editEmbedPrefix.length),
    };
  }

  if (customId.startsWith(MODAL_IDS.editPostPrefix)) {
    return {
      kind: DRAFT_KIND.post,
      draftId: customId.slice(MODAL_IDS.editPostPrefix.length),
    };
  }

  return null;
}

function getScheduleDraftId(customId) {
  if (!customId.startsWith(MODAL_IDS.schedulePrefix)) {
    return null;
  }

  return customId.slice(MODAL_IDS.schedulePrefix.length);
}

function getRoleTagDraftId(customId) {
  if (!customId.startsWith(MODAL_IDS.roleTagPrefix)) {
    return null;
  }

  return customId.slice(MODAL_IDS.roleTagPrefix.length);
}

function getImagesDraftId(customId) {
  if (!customId.startsWith(MODAL_IDS.imagePrefix)) {
    return null;
  }

  return customId.slice(MODAL_IDS.imagePrefix.length);
}

function getButtonAction(customId) {
  if (customId.startsWith(BUTTON_IDS.postNowPrefix)) {
    return {
      action: "post",
      draftId: customId.slice(BUTTON_IDS.postNowPrefix.length),
    };
  }

  if (customId.startsWith(BUTTON_IDS.editPrefix)) {
    return {
      action: "edit",
      draftId: customId.slice(BUTTON_IDS.editPrefix.length),
    };
  }

  if (customId.startsWith(BUTTON_IDS.schedulePrefix)) {
    return {
      action: "schedule",
      draftId: customId.slice(BUTTON_IDS.schedulePrefix.length),
    };
  }

  if (customId.startsWith(BUTTON_IDS.roleTagPrefix)) {
    return {
      action: "roletag",
      draftId: customId.slice(BUTTON_IDS.roleTagPrefix.length),
    };
  }

  if (customId.startsWith(BUTTON_IDS.imagePrefix)) {
    return {
      action: "image",
      draftId: customId.slice(BUTTON_IDS.imagePrefix.length),
    };
  }

  return null;
}

function isDraftModal(customId) {
  return (
    customId === MODAL_IDS.createEmbed ||
    customId === MODAL_IDS.createPost ||
    customId.startsWith(MODAL_IDS.editEmbedPrefix) ||
    customId.startsWith(MODAL_IDS.editPostPrefix) ||
    customId.startsWith(MODAL_IDS.schedulePrefix) ||
    customId.startsWith(MODAL_IDS.roleTagPrefix) ||
    customId.startsWith(MODAL_IDS.imagePrefix)
  );
}

function isValidTargetChannel(channel) {
  return Boolean(
    channel && ALLOWED_TARGET_CHANNEL_TYPES.includes(channel.type),
  );
}

module.exports = {
  DRAFT_KIND,
  buildCreateModal,
  buildDraftPostedEmbed,
  buildEditModal,
  buildGalleryEmbeds,
  buildImagesModal,
  buildPreviewMessage,
  buildRoleTagModal,
  buildScheduleModal,
  getButtonAction,
  getCreateContext,
  getEditContext,
  getImagesDraftId,
  getPreviewChannelId,
  getRoleTagDraftId,
  getScheduleDraftId,
  isDraftModal,
  isValidTargetChannel,
  parseEmbedModal,
  parseImagesModal,
  parsePostModal,
  parseRoleTagModal,
  parseScheduleModal,
};
