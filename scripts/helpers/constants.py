
ASCIIDOC_FILEEXTENSION = ".adoc"
PATH_DIVIDER = "/"
LOCAL_PATH = "./"
BACK_PATH = "../"
PAGES_NAME = "pages"
PAGES_REF = "page$"
PARTIALS_NAME = "partials"
PARTIALS_REF = "partial$"
MODULES_NAME = "modules"
MODULE_SEPARATOR = ":"

# Default Values
DEFAULT_OUTPUT_PATH = "output/"
DEFAULT_OUTPUT_FILENAME = "results"
EXCLUDED_DIRECTORY_NAMES = ["assets","examples","partials"]

# Attributes
KEYWORDDS = "keywords"

# Macros
XREF_MACRO = "xref:"
REFERENCE_MACRO = "reference::"
ROLE_MACRO = "role_related::"
RELATED_MACRO = "related::"
LINK_MACRO = "link:"
INCLUDE_MACRO = "include::"
PAGES_MACRO = "pages::"

# Composite Constants
NAV = "nav"+ASCIIDOC_FILEEXTENSION
PAGES_PATH = PAGES_NAME+PATH_DIVIDER
PARTIALS_PATH = PARTIALS_NAME+PATH_DIVIDER

# Return Values
TYPE_PARTIAL = "is_partial"
TYPE_PAGE = "is_page"
TYPE_UNKNOWN = "unknown"

# Filenames And Paths
USED_KEYWORDS_FILENAME = "0_used-keywords"
USED_KEYWORDS_PATH = "../doc/modules/compendium/pages/"
LINK_CONCEPT_FILENAME = "link-concept"
LINK_CONCEPT_PATH = "../doc/modules/project-guide/examples/"