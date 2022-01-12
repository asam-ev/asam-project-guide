import copy
import re
from os import path, walk

from helpers import constants as C
from helpers import functions as F

class AsciiDocContent:
    # Global dicts for referencing
    attr_dict = {}
    keywords_dict = {}
    roles_dict = {}
    xref_occurence_dict = {}
    link_occurence_dict = {}
    inverse_link_ocurence_dict = {}
    local_xref_occurence_dict = {}
    partial_include_dict = {}

    # Lists of AsciiDocContent instances where a custom macro was found
    reference_macro_occurence_list = []
    related_topics_macro_occurence_list = []
    role_related_topics_macro_occurence_list = []
    pages_macro_occurence_list = []
    include_by_keyword_macro_occurence_list = []

    # Internal list of all instances of this class
    adoc_files = []

    # Global patterns definition
    pattern_keywords = ""
    pattern_attr = ""
    pattern_roles = ""
    pattern_pages = ""
    pattern_ref = ""
    pattern_role_reltop = ""
    pattern_reltop = ""
    # pattern_xref_macro: (2) = module; (3) = path/filename; (5) = id
    pattern_xref_macro = ""
    # pattern_link_macro: (1) = url (via link); (4): url (direct)
    pattern_link_macro = ""
    # pattern_local_xref_macro: (1) = local reference; (3) = display text
    pattern_local_xref_macro = ""

    def __init__(self, path, filename):
        content = []
        with open(path+filename,"r") as file:
            content = file.readlines()
        self.check_patterns_exist()

        self.content = content
        self.original_content = copy.deepcopy(self.content)
        self.filename = filename
        self.path = path
        self.module, self.module_path = self._set_module_and_module_path()
        self.update_linking_dicts()
        if not self in self.adoc_files:
            self.adoc_files.append(self)

        self.type = self._get_type_from_path(self.path)
        self.find_attributes()
        self.find_keywords()
        self.find_roles()
        self._get_all_partial_includes()

        self.find_reference_macro()
        self.find_related_topics_macro()
        self.find_role_related_topics_macro()
        self.find_pages_macro()

    def check_patterns_exist(self):
        if not self.pattern_keywords:
            self.pattern_keywords = re.compile("^\s*:{keywords}:(.*)".format(keywords = C.KEYWORDDS))

        if not self.pattern_attr:
            self.pattern_attr = re.compile("^\s*:([^:]*):(.*)")

        if not self.pattern_roles:
            self.pattern_roles = re.compile("{role-([^}]*)}")

        if not self.pattern_ref:
            self.pattern_ref = re.compile("^\s*{ref}(.*)\[(.*)\]\n?".format(ref = C.REFERENCE_MACRO))

        if not self.pattern_role_reltop:
            self.pattern_role_reltop = re.compile("^\s*{role}(.*)\[(.*)\]\n?".format(role = C.ROLE_MACRO))

        if not self.pattern_reltop:
            self.pattern_reltop = re.compile("^\s*{rel}(.*)\[(.*)\]\n?".format(rel = C.RELATED_MACRO))

        if not self.pattern_xref_macro:
            self.pattern_xref_macro = re.compile(C.XREF_MACRO+"{1,2}(([^\s:\[]*):)?([^#\n\[]*)(#([^\[]*))?\[.*\]")

        if not self.pattern_link_macro:
            self.pattern_link_macro = re.compile(C.LINK_MACRO+"{1,2}(http[^#\n\[]*)(#([^\[]*))?\[.*\]|(http[^\[]*)(#([^\[]*))?\[.*\]")

        if not self.pattern_local_xref_macro:
            self.pattern_local_xref_macro = re.compile("<<{1,2}([^#\n\,]*)(,[^>]*)?>>")

        if not self.pattern_pages:
            self.pattern_pages = re.compile("^\s*{page}[\[]*\[(.*)\]\n?".format(page = C.PAGES_MACRO))


    def _set_module_and_module_path(self):
        module, __, __, module_path = self._get_module_from_path(self.path)
        # print("path",self.path,"filename",self.filename,"module",module)

        return module, module_path

    def _get_module_from_path(self,path):
        path_parts = path.split(C.PATH_DIVIDER)
        module = ""
        index_pages = 0
        module_path = ""
        try:
            index_pages = path_parts.index(C.PAGES_NAME)

            if index_pages > 0 :
                module = path_parts[index_pages-1]

            module_path = C.PATH_DIVIDER.join(path_parts[index_pages+1:])
        except:
            try:
                index_pages = path_parts.index(C.PARTIALS_NAME)

                if index_pages > 0 :
                    module = path_parts[index_pages-1]

                module_path = C.PATH_DIVIDER.join(path_parts[index_pages+1:])
            except:
                try:
                    index_modules = path_parts.index(C.MODULES_NAME)
                    if index_modules > -1 :
                        module = path_parts[index_modules+1]

                except:
                    pass

        return module, index_pages-1, path_parts, module_path

    def _get_type_from_path(self,path):
        path_parts = path.split(C.PATH_DIVIDER)
        try:
            path_parts.index(C.PARTIALS_NAME)
            return(C.TYPE_PARTIAL)
        except ValueError:
            try:
                path_parts.index(C.PAGES_NAME)
                return(C.TYPE_PAGE)

            except ValueError:
                return(C.TYPE_UNKNOWN)

            except:
                raise
        except:
            raise

    def has_module(self):
        result = False
        module,__,__,__ = self._get_module_from_path(self.path)
        if module:
            result = True
        return result

    def find_attributes(self):
        attr = []
        for line in self.content:
            result = self.pattern_attr.findall(line)
            if result:
                attr.append(result)

        if attr:
            for a in attr:
                c = a[0][1]
                if a[0][1].find(C.LOCAL_PATH)>-1 and a[0][1].find(C.BACK_PATH)<0:
                    # print("Only ./:",a[0][1])
                    c = a[0][1].replace(C.LOCAL_PATH,self.module+C.MODULE_SEPARATOR+C.PARTIALS_REF+self.module_path)
                elif a[0][1].find(C.LOCAL_PATH)>-1 and a[0][1].find(C.BACK_PATH)>-1:
                    # print("With ../:",a[0][1])
                    pattern = re.compile("\.\./")
                    x = [m.start() for m in pattern.finditer(a[0][1])]
                    # print(self.module_path)


                    c = a[0][1].replace(C.LOCAL_PATH,self.module+C.MODULE_SEPARATOR+C.PARTIALS_REF+self.module_path)
                self.attr_dict["{"+a[0][0].replace(" ","")+"}"] = c.replace(" ","")
        return attr

    def find_keywords(self):
        attr = []
        for line in self.content:
            result = self.pattern_keywords.findall(line)
            if result:
                attr.append(result)

        if attr:
            attributes = attr[0][0].split(",")
            while("" in attributes) :
                attributes.remove("")
            self._add_to_selected_dict(attributes,self.keywords_dict)
        return attr

    def find_roles(self):
        roles = []
        for line in self.content:
            result = self.pattern_roles.findall(line)
            if result:
                roles.append(result)

        if roles:
            attributes = [x[0] for x in roles]
            while("" in attributes) :
                attributes.remove("")

            self._add_to_selected_dict(attributes,self.roles_dict)
        return roles

    def _add_to_selected_dict(self, attributes,target_dict):
        for attr_o in attributes:
            attr = attr_o.replace(" ","")
            if attr in target_dict.keys():
                target_dict[attr].append((self.path,self.filename))
            elif attr not in target_dict.keys():
                target_dict[attr]=[(self.path,self.filename)]

    def find_related_topics_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_reltop,find_and_replace,"related-topics")
        return found

    def find_role_related_topics_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_role_reltop,find_and_replace,"role-related-topics")
        return found

    def find_pages_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_pages,find_and_replace,"pages")
        return found

    def find_reference_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_ref,find_and_replace,"reference")
        return found

    def find_include_by_keyword_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_keyword_include,find_and_replace,"include_by_keyword")
        return found

    def _add_to_reference_macro_occurence_list(self):
        self.reference_macro_occurence_list.append(self)

    def _add_to_related_topics_macro_occurence_list(self):
        self.related_topics_macro_occurence_list.append(self)

    def _add_to_role_related_topics_macro_occurence_list(self):
        self.role_related_topics_macro_occurence_list.append(self)

    def _add_to_pages_macro_occurence_list(self):
        self.pages_macro_occurence_list.append(self)

    def _find_macro_of_type(self,pattern,find_and_replace,type):
        found = False
        i = 0
        for line in self.content:
            result = pattern.findall(line)
            if result:
                found = True
                if(type=="reference"):
                    if find_and_replace:
                        self.substitute_reference_macro(result[0],i)
                    else:
                        self._add_to_reference_macro_occurence_list()
                        break
                elif(type=="related-topics"):
                    if find_and_replace:
                        self.substitute_related_topics_macro(result[0],i)
                    else:
                        self._add_to_related_topics_macro_occurence_list()
                        break
                elif(type=="role-related-topics"):
                    if find_and_replace:
                        self.substitute_role_related_topics_macro(result[0],i)
                    else:
                        self._add_to_role_related_topics_macro_occurence_list()
                        break
                elif(type=="pages"):
                    if find_and_replace:
                        self.substitute_pages_macro(result[0],i)
                    else:
                        self._add_to_pages_macro_occurence_list()
                else:
                    print("Unknown type for find_macro_of_type provided: "+type)
                    return False

            i += 1

        return found

    def substitute_reference_macro(self,ref_list,line):
        self.content[line] = ""
        offset = 1
        self.insert_references_in_content(line,offset,ref_list,self.keywords_dict)


    def substitute_related_topics_macro(self,ref_list,line):
        self.content[line] = "== Related topics\n\n"
        self.content.insert(line+1,"")
        offset = 2
        self.insert_references_in_content(line,offset,ref_list,self.keywords_dict)

    def substitute_role_related_topics_macro(self,ref_list_in,line):
        target_dict = self.roles_dict
        ref_list = ref_list_in
        additional_dict = self.keywords_dict
        if not ref_list[1]:
            self.content[line] = "== Role-related topics\n\n"
        else:
            self.content[line] = "\n"

        self.content.insert(line+1,"")
        offset = 2

        if ref_list[1]:
            ref_self = ref_list[0]
            ref_list = ref_list[1].split(",")
            target_dict = {}
            for i in range(len(ref_list)):
                key = "{content}".format(content=ref_list[i])
                if key in additional_dict:
                    target_dict[key] = [x for x in additional_dict[key] if x in self.roles_dict[ref_self]]


        self.insert_references_in_content(line,offset,ref_list,target_dict)


    def substitute_pages_macro(self,arg_list,line):
        args = arg_list.split(",")
        do_all = False
        if "all" in args:
            do_all = True

        path_offset = ""
        args = [x.split("=") for x in args]
        for a in args:
            if "path" in a:
                path_offset = a[1]

        self.content[line] = "== Pages\n\n"
        self.content.insert(line+1,"")
        offset = 2
        pages_dict = self.get_other_pages_and_folders(do_all,path_offset)

        fake_ref_list = [self.filename]
        self.insert_references_in_content(line,offset,fake_ref_list,pages_dict)

    def get_other_pages_and_folders(self,do_all,path_offset):
        files = []
        folders = []
        new_dict = {}
        target_path = self.path if not path_offset else self.path+path_offset+"/"
        target_path = target_path.replace("//","/")

        for (dirpath, dirnames, filenames) in walk(target_path):
            if(dirpath[-1] != C.PATH_DIVIDER):
                dirpath += C.PATH_DIVIDER

            dirpath = dirpath.replace("\\",C.PATH_DIVIDER)

            for filename in filenames:
                if filename == self.filename and not path_offset:
                    continue

                if filename.endswith(C.ASCIIDOC_FILEEXTENSION):
                    files.append((dirpath,filename))

            folders = dirnames
            if not do_all:
                break

        new_dict[self.filename] = files
        return new_dict

    def get_references_and_exceptions(self,ref_list_input):
        ref_list = ref_list_input[0]
        total_ref_elements = [x.replace(" ","") for x in ref_list.split(",")]
        references = [x.replace(" ","") for x in ref_list.split(",") if not x.startswith("!")]
        exceptions = [x[1:] for x in list(set(total_ref_elements) - set(references))]
        return references,exceptions

    def insert_references_in_content(self,line,offset,ref_list,target_dict):
        references, exceptions = self.get_references_and_exceptions(ref_list)
        replacement_content = []
        if references:
            for ref in references:
                new_text = self._make_reference_replacement_text(ref,exceptions,target_dict)
                replacement_content += new_text

            replacement_content = sorted(list(dict.fromkeys(replacement_content)))
            self.content[line+offset:line+offset]=replacement_content

    def _make_reference_replacement_text(self,ref_text,exceptions,target_dict):
        reference_structure = "* "+C.XREF_MACRO
        reference_ending = "[]\n"
        self_exclusion = (self.path,self.filename)


        link_text = []
        excl_links = [self_exclusion]
        links = []

        try:
            links = target_dict[ref_text]
        except:
            # raise ReferenceNotFound(ref_text+" not found in keys: "+self.attributes_dict.keys())
            print(ref_text+" not found in keys: "+",".join(target_dict.keys()))

        for exc in exceptions:
            try:
                excl_links.append(target_dict[exc])
            except:
                pass

        for link in links:
            pass_this_link = False
            for exc in excl_links:
                if link == exc:
                    pass_this_link = True
                break

            if pass_this_link:
                continue
            module_addition = ""
            path_addition = ""
            link_module, link_module_index, link_path_parts,__ = self._get_module_from_path(link[0])

            # always add module_addition
            module_addition = link_module+C.MODULE_SEPARATOR

            ## Only add module addition if not in same module
            # if not self.module == link_module:
            #     module_addition = link_module+C.MODULE_SEPARATOR



            if link_module_index+2 < len(link_path_parts):
                path_addition = C.PATH_DIVIDER.join(link_path_parts[link_module_index+2:])

            link_text.append(reference_structure+module_addition+path_addition+link[1]+reference_ending)

        return link_text

    def revert_macro_substitution(self):
        self.content = copy.deepcopy(self.original_content)

    def write_to_file(self,filename="",path=""):
        if not filename:
            filename = self.filename

        if not path:
            path = self.path

        with open(path+filename,'w') as file:
            file.writelines(self.content)

    def update_linking_dicts(self):
        xref = []
        url = []
        local_xref = []
        for line in self.content:
            result_xref = self.pattern_xref_macro.findall(line)
            result_url = self.pattern_link_macro.findall(line)
            result_local_xref = self.pattern_local_xref_macro.findall(line)
            if result_xref:
                xref += result_xref

            if result_url:
                url.append(result_url)

            if result_local_xref:
                local_xref.append(result_local_xref)


        if xref:
            self._add_to_xref_occurence_dict(xref)

        if url:
            self._add_to_link_occurence_dict(url)

        if local_xref:
            self._add_to_local_xref_occurence_dict(local_xref)


        return xref, url, local_xref

    def _add_to_xref_occurence_dict(self,xref):
        key = self.module+"\\\\"+self.module_path+self.filename
        if not key in self.xref_occurence_dict:
            self.xref_occurence_dict[key] = []

        for x in xref:
            if isinstance(x,list):
                for i in x:
                    self._add_entry_to_xref_occurence_dict(i,key)

            else:
                self._add_entry_to_xref_occurence_dict(x,key)

    def _add_entry_to_xref_occurence_dict(self,x,key):
        # TODO: Replace attributes in links with correct text

        module = x[1]
        full_filename = x[2]
        identity = x[4]
        split_filename = full_filename.split(C.PATH_DIVIDER)
        filename = split_filename[-1]
        path = ""
        if len(split_filename)>1:
            path = C.PATH_DIVIDER.join(split_filename[:-1])

        if not module:
            module = self.module

        value = {"module":module,"module_path":path,"filename":filename,"id":identity}
        duplicate = False
        for entry in self.xref_occurence_dict[key]:
            if entry['module'] == module and entry['module_path'] == path and entry['filename'] == filename and entry['id'] == identity:
                duplicate = True
                if not "occurence" in entry:
                    entry['occurence'] = 1
                else:
                    entry['occurence'] = entry['occurence'] + 1

        if not duplicate:
            self.xref_occurence_dict[key].append(value)

    def _add_to_link_occurence_dict(self,links):
        key = self.module+"\\\\"+self.module_path+self.filename
        if not key in self.link_occurence_dict:
            self.link_occurence_dict[key] = []

        for l in links:
            if isinstance(l,list):
                for i in l:
                    self._add_entry_to_link_occurence_dict(i,key)

            else:
                self._add_entry_to_link_occurence_dict(l,key)

    def _add_entry_to_link_occurence_dict(self,l,key):
        # TODO: Replace attributes in links with correct text

        # pattern_link_macro: (1) = url (via link); (4): url (direct)
        url = l[0] if l[0] else l[3]

        value = {"url":url}
        duplicate = False
        for entry in self.link_occurence_dict[key]:
            if entry['url'] == url:
                duplicate = True
                if not "occurence" in entry:
                    entry['occurence'] = 1
                else:
                    entry['occurence'] = entry['occurence'] + 1

        if not duplicate:
            self.link_occurence_dict[key].append(value)

    def _add_to_local_xref_occurence_dict(self,local_xref):
        x = 0
        # TODO: Create logic

    def _add_puml_content(self,content_list,files_list,full_list,linked_files,name=""):
        container_type = "package"
        page_type = "rectangle"
        web_type = "cloud"
        graph_start = "@startuml"
        content_list = [graph_start]
        i = 1
        m = 0
        current_module = ""
        color_choices = ['#FF0000', '#0000FF', '#00FF00', '#CCCC00', '#FF00FF', '#000080', '#800000', '#808000', '#800080','#008080','#00FFFF']
        current_color = 0

        for f in files_list:

            # Create new module container for diagram when switching to new module
            if not current_module:
                current_module = f["module"]
                if "color" in f.keys():
                    current_color = color_choices.index(f['color'][1:-1])
                content_list.append("{type} {cmod} {color} {{".format(type = container_type,cmod = current_module,color = F.color_variant(color_choices[current_color])))
            elif current_module != f["module"]:
                m += 1
                i = 1
                if "color" in f.keys():
                    current_color = color_choices.index(f['color'][1:-1])
                else:
                    new_val = current_color+1
                    limit = len(color_choices)-1
                    current_color = new_val % limit

                content_list.append("}")
                current_module = f["module"]
                content_list.append("{type} {cmod} {color} {{".format(type = container_type,cmod = current_module,color = F.color_variant(color_choices[current_color])))

            if not "plantuml_id" in f.keys():
                f["plantuml_id"] = "f{mod}_{num}".format(mod = m,num = i)

            if not "color" in f.keys():
                f["color"] = "[{color}]".format(color = color_choices[current_color])
            content_list.append('{type} "{fileidentifier}" as {num}'.format(type = page_type,fileidentifier = f["module_path"]+f["filename"], num = f["plantuml_id"]))
            i +=1

        content_list.append("}")
        content_list.append("")

        xref_uml_arrows = []
        for xref_key in self.xref_occurence_dict:
            for xref in self.xref_occurence_dict[xref_key]:
                xref_found = False
                for f in files_list:
                    f_in_xref = f['module'] == xref['module'] and f['module_path'] == xref['module_path'] and f['filename'] == xref['filename']
                    if f_in_xref:
                        if not f in linked_files:
                            linked_files.append(f)

                        for t in full_list:
                            if t['module']+"\\\\"+t['module_path']+t['filename'] == xref_key:
                                xref_found = True
                                f_split = f['plantuml_id'].split("_")
                                t_split = t['plantuml_id'].split("_")

                                arrow = " -{color}-> ".format(color = t['color'])

                                if t_split[0] != f_split[0]:
                                    arrow = " --{color}--> ".format(color = t['color'])

                                xref_uml_arrows.append(t['plantuml_id'] + arrow + f['plantuml_id'])
                                if not t in linked_files:
                                    linked_files.append(t)

                                break

                        if xref_found:
                            break

        content_list += xref_uml_arrows
        content_list.append("")
        sorted_linked_files = sorted(linked_files, key=lambda d: d['module'])
        return content_list,sorted_linked_files

    def create_linking_concept(self, output_filename = C.LINK_CONCEPT_FILENAME, output_path = C.LINK_CONCEPT_PATH):
        all_files = []
        linked_files = []
        unlinked_files = []
        graph_file_extension = ".puml"
        unlinked_addon = "-unlinked"
        full_addon = "-full"
        txt_file_extension = ".json"
        container_type = "package"
        page_type = "rectangle"
        web_type = "cloud"
        for afile in self.adoc_files:
            file_identifier = {"filename": afile.filename,"module_path":afile.module_path,"module":afile.module}
            if not file_identifier in all_files:
                all_files.append(file_identifier)

        output_content_graph_full = []
        output_content_graph  = []
        output_content_graph_unlinked = []
        output_content_graph_web = []

        output_content_graph_full,linked_files = self._add_puml_content(output_content_graph_full,all_files,all_files,linked_files,name="full")
        output_content_graph,__ = self._add_puml_content(output_content_graph,linked_files,all_files,linked_files,name="linked")
        for f in all_files:
            if f not in linked_files:
                unlinked_files.append(f)

        output_content_graph_unlinked,__ = self._add_puml_content(output_content_graph_unlinked,unlinked_files,all_files,linked_files,name="unlinked")


        target_urls = {}
        target_links = []
        i = 1
        for link_key in self.link_occurence_dict:
            plantuml_id = ""
            for f in all_files:
                if f['module']+"\\\\"+f['module_path']+f['filename'] == link_key:
                    plantuml_id = f['plantuml_id']
                    break

            for link in self.link_occurence_dict[link_key]:
                if link['url'] in target_urls:
                    url_id = target_urls[link['url']]

                else:
                    url_id = "u"+str(i)
                    target_urls[link['url']] = url_id
                    i+=1

                target_links.append(plantuml_id + " .up.>> " + url_id)

        for u in target_urls:
            output_content_graph_full.append('{type} "{url}"  as {url_id}'.format(type=web_type,url = u,url_id = target_urls[u]))
            # output_content.append("url of {url_id} is [[{url}]]".format(url_id = target_urls[u], url = u))

        output_content_graph_full.append("")

        output_content_graph_full += target_links

        output_content_graph_full.append("@enduml")
        output_content_graph.append("@enduml")
        output_content_graph_unlinked.append("@enduml")
        output_graph_full = "\n".join(output_content_graph_full)
        output_graph = "\n".join(output_content_graph)
        output_graph_unlinked = "\n".join(output_content_graph_unlinked)

        with open(output_path+C.PATH_DIVIDER+output_filename+graph_file_extension,"w") as file:
            file.write(output_graph)

        with open(output_path+C.PATH_DIVIDER+output_filename+unlinked_addon+graph_file_extension,"w") as file:
            file.write(output_graph_unlinked)

        with open(output_path+C.PATH_DIVIDER+output_filename+full_addon+graph_file_extension,"w") as file:
            file.write(output_graph_full)


    def write_attributes_to_file(self,output_filename = C.USED_KEYWORDS_FILENAME, output_path = C.USED_KEYWORDS_PATH):
        content = ["= Used keywords In ASAM Project Guide"]
        content.append(":description: Automatically generated overview over all keywords used throughout this Project Guide.")
        content.append(":keywords: generated,keywords,link-concept,structure")
        content.append("")
        content.append("This page is an automatically generated list of all keywords used throught this Project Guide.")
        content.append("Every keyword has its own subsection and contains a link to each page as well as the original filename, path and module in the repository.")
        content.append("")
        content.append("== List of keywords")
        content.append("")

        for a in sorted(self.keywords_dict):
            content.append("")
            content.append("=== {attr}".format(attr = a))
            content.append("")
            for f in self.keywords_dict[a]:
                module, __, __, module_path = self._get_module_from_path(f[0])
                content.append("* {xref}{module}:{path}{filename}[{module}/{pages}{path}{filename}]".format(xref = C.XREF_MACRO,pages=C.PAGES_PATH,module = module,path=module_path,filename=f[1]))


        content.append("")
        content.append("related::structure[]")
        content.append("")
        output = "\n".join(content)
        with open(output_path+C.PATH_DIVIDER+output_filename+".adoc","w") as file:
            file.write(output)

        return AsciiDocContent(output_path,output_filename+".adoc")

    def _get_all_partial_includes(self):
        for line in self.content:
            include_index = line.find(C.INCLUDE_MACRO)
            if include_index > -1:
                if line.find(C.LOCAL_PATH)>-1 and line.find(C.BACK_PATH)<0:
                    # print("Only ./:",line)
                    line = line.replace(C.LOCAL_PATH,self.module+C.MODULE_SEPARATOR+C.PARTIALS_REF+self.module_path)
                elif line.find(C.LOCAL_PATH)>-1 and line.find(C.BACK_PATH)>-1:
                    pattern = re.compile("\.\./")
                    x = [m.start() for m in pattern.finditer(line)]
                    path_parts = self.module_path.split(C.PATH_DIVIDER)
                    path_parts = path_parts[:-1]
                    for i in range(len(x)):
                        path_parts = path_parts[:-1]

                    line = line.replace(C.BACK_PATH,self.module+C.MODULE_SEPARATOR+C.PARTIALS_REF+C.PATH_DIVIDER.join(path_parts)+C.PATH_DIVIDER,1)
                    line = line.replace(C.BACK_PATH,"")


                start = line.find(C.PARTIALS_REF) if line.find(C.PARTIALS_REF) > -1 else include_index+10
                end = line.find("[")
                # if self.filename.find("ions_comp") >-1:
                #     print(self.filename)
                #     print(line)

                if include_index+9 == start:
                    self.partial_include_dict[self.module+C.MODULE_SEPARATOR+line[include_index+9:end]]=""
                else:
                    self.partial_include_dict[line[include_index+9:end]]=self.module+C.MODULE_SEPARATOR+C.PARTIALS_REF+self.module_path


class ReferenceNotFound(Exception):
    pass


