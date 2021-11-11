import copy
from posixpath import dirname
import sys, getopt
import os
from os import walk
import re
# import lib.AdocWriter

def main(argv):
    parameters = "p:"
    parameters_long = ["path="]
    path = "../"
    excluded_directory_names = ["assets","examples","partials"]

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into.")

    for opt,arg in opts:
        if opt in ("-p","--path"):
            path = path + arg

    found_files = []

    for (dirpath, dirnames, filenames) in walk(path):
        if(dirpath[-1] != "/"):
            dirpath += "/"

        skip = False
        dirpath = dirpath.replace("\\","/")
        for exc in excluded_directory_names:
            if dirpath.find("/"+exc)>-1:
                skip = True
                break

        if skip:
            print("Skipped path "+dirpath)
            continue

        else:
            for filename in filenames:
                if filename.endswith(".adoc"):
                    asciidoc_file = AsciiDocContent(dirpath,filename)
                    if asciidoc_file.has_module():
                        attributes = asciidoc_file.find_attributes()
                        macro_found = asciidoc_file.find_reference_macro()
                        macro_found = asciidoc_file.find_related_topics_macro()
                        found_files.append(asciidoc_file)

    for afile in found_files:
        if afile in found_files[0].reference_macro_occurence_list:
            afile.find_reference_macro(find_and_replace=True)

        if afile in found_files[0].related_topics_macro_occurence_list:
            afile.find_related_topics_macro(find_and_replace=True)

        afile.write_to_file()
        afile.revert_macro_substitution()
        afile.write_to_file(filename=afile.filename+"1")

    found_files[0].create_linking_concept_graph()


class AsciiDocContent:
    attributes_dict = {}
    reference_macro_occurence_list = []
    related_topics_macro_occurence_list = []
    include_by_keyword_macro_occurence_list = []
    xref_occurence_dict = {}
    link_occurence_dict = {}
    inverse_link_ocurence_dict = {}
    local_xref_occurence_dict = {}
    adoc_files = []

    def __init__(self, path, filename):
        content = []
        with open(path+filename,"r") as file:
            content = file.readlines()


        self.pattern_attr = re.compile("^\s*:keywords:(.*)")

        self.pattern_ref = re.compile("reference::(.*)\n?")

        self.pattern_reltop = re.compile("related::(.*)\n?")

        # pattern_xref_macro: (2) = module; (3) = path/filename; (5) = id
        self.pattern_xref_macro = re.compile("xref:{1,2}(([^\s:\[]*):)?([^#\n\[]*)(#([^\[]*))?\[.*\]")

        # pattern_link_macro: (1) = url (via link); (4): url (direct)
        self.pattern_link_macro = re.compile("link:{1,2}(http[^#\n\[]*)(#([^\[]*))?\[.*\]|(http[^\[]*)(#([^\[]*))?\[.*\]")

        # pattern_local_xref_macro: (1) = local reference; (3) = display text
        self.pattern_local_xref_macro = re.compile("<<{1,2}([^#\n\,]*)(,[^>]*)?>>")

        self.content = content
        self.original_content = copy.deepcopy(self.content)
        self.filename = filename
        self.path = path
        self.module, self.module_path = self._set_module_and_module_path()
        self.update_linking_dicts()
        self.adoc_files.append(self)

    def _set_module_and_module_path(self):
        module, __, __, module_path = self._get_module_from_path(self.path)
        # print("path",self.path,"filename",self.filename,"module",module)

        return module, module_path

    def _get_module_from_path(self,path):
        path_parts = path.split("/")
        module = ""
        index_pages = 0
        module_path = ""
        try:
            index_pages = path_parts.index("pages")
            if index_pages > 0 :
                module = path_parts[index_pages-1]

            module_path = "/".join(path_parts[index_pages+1:])
        except:
            try:
                index_modules = path_parts.index("modules")
                if index_modules > -1 :
                    module = path_parts[index_modules+1]

            except:
                pass


        return module, index_pages-1, path_parts, module_path

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
            attributes = attr[0][0].split(",")
            self._add_to_attributes_dict(attributes)
        return attr

    def _add_to_attributes_dict(self, attributes):
        for attr_o in attributes:
            attr = attr_o.replace(" ","")
            if attr in self.attributes_dict.keys():
                self.attributes_dict[attr].append((self.path,self.filename))
            elif attr not in self.attributes_dict.keys():
                self.attributes_dict[attr]=[(self.path,self.filename)]

    def find_related_topics_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_reltop,find_and_replace,"related-topics")
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
                else:
                    print("Unknown type for find_macro_of_type provided: "+type)
                    return False

            i += 1

        return found

    def substitute_reference_macro(self,ref_list,line):
        self.content[line] = ""
        offset = 1
        self.insert_references_in_content(line,offset,ref_list)


    def substitute_related_topics_macro(self,ref_list,line):
        self.content[line] = "== Related Topics\n\n"
        self.content.insert(line+1,"")
        offset = 2
        self.insert_references_in_content(line,offset,ref_list)

    def make_cross_reference_replacements(self,ref_list):
        total_ref_elements = [x.replace(" ","") for x in ref_list.split(",")]
        references = [x.replace(" ","") for x in ref_list.split(",") if not x.startswith("!")]
        exceptions = [x[1:] for x in list(set(total_ref_elements) - set(references))]
        return references,exceptions

    def insert_references_in_content(self,line,offset,ref_list):
        references, exceptions = self.make_cross_reference_replacements(ref_list)
        replacement_content = []
        if references:
            for ref in references:
                new_text = self._make_reference_replacement_text(ref,exceptions)
                replacement_content += new_text

            replacement_content = list(dict.fromkeys(replacement_content))
            self.content[line+offset:line+offset]=replacement_content

    def _make_reference_replacement_text(self,ref_text,exceptions):
        reference_structure = "* xref:"
        reference_ending = "[]\n"

        link_text = []
        excl_links = []
        links = []

        try:
            links = self.attributes_dict[ref_text]

        except:
            # raise ReferenceNotFound(ref_text+" not found in keys: "+self.attributes_dict.keys())
            print(ref_text+" not found in keys: "+",".join(self.attributes_dict.keys()))

        for exc in exceptions:
            try:
                excl_links.append(self.attributes_dict[exc])
            except:
                print("No exceptions found!")

        for link in links:
            pass_this_link = False
            for exc in excl_links:
                if link in exc:
                    pass_this_link = True
                break

            if pass_this_link:
                continue
            module_addition = ""
            path_addition = ""
            link_module, link_module_index, link_path_parts,__ = self._get_module_from_path(link[0])
            if not self.module == link_module:
                module_addition = link_module+":"

            if link_module_index+2 < len(link_path_parts):
                path_addition = "/".join(link_path_parts[link_module_index+2:])

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
        split_filename = full_filename.split("/")
        filename = split_filename[-1]
        path = ""
        if len(split_filename)>1:
            path = "/".join(split_filename[:-1])

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

    def create_linking_concept_graph(self, output_filename = "linking_concept.puml", output_path = "../doc/modules/ROOT/examples/"):
        files = []
        for afile in self.adoc_files:
            files.append({"filename": afile.filename,"module_path":afile.module_path,"module":afile.module})

        output_content = ["@startuml"]
        i = 1
        m = 0
        current_module = ""
        for f in files:
            if not current_module:
                current_module = f["module"]
                output_content.append("component {comp} {{".format(comp = current_module))
            elif current_module != f["module"]:
                m += 1
                i = 1
                output_content.append("}")
                current_module = f["module"]
                output_content.append("component {comp} {{".format(comp = current_module))


            f["plantuml_id"] = "f{mod}_{num}".format(mod = m,num = i)
            output_content.append('rectangle "{fileidentifier}" as {num}'.format(fileidentifier = f["module"]+":"+f["module_path"]+f["filename"], num = f["plantuml_id"]))
            i +=1

        output_content.append("}")
        output_content.append("")

        for xref_key in self.xref_occurence_dict:
            for xref in self.xref_occurence_dict[xref_key]:
                for f in files:
                    if f['module'] == xref['module'] and f['module_path'] == xref['module_path'] and f['filename'] == xref['filename']:
                        for t in files:
                            if t['module']+"\\\\"+t['module_path']+t['filename'] == xref_key:
                                f_split = f['plantuml_id'].split("_")
                                t_split = t['plantuml_id'].split("_")

                                arrow = " -> "

                                if t_split[0] > f_split[0]:
                                    arrow = " -up-> "

                                elif t_split[1] < f_split[1]:
                                    arrow = " -left-> "

                                output_content.append(f['plantuml_id'] + arrow + t['plantuml_id'])
                                break

                        break

        output_content.append("")

        target_urls = {}
        target_links = []
        i = 1
        for link_key in self.link_occurence_dict:
            # key = self.module+"\\\\"+self.module_path+"/"+self.filename
            # value = url
            plantuml_id = ""
            for f in files:
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
            output_content.append('cloud "{url}"  as {url_id}'.format(url = u,url_id = target_urls[u]))
            # output_content.append("url of {url_id} is [[{url}]]".format(url_id = target_urls[u], url = u))

        output_content.append("")

        output_content += target_links

        output_content.append("@enduml")
        output = "\n".join(output_content)
        with open(output_path+"/"+output_filename,"w") as file:
            file.write(output)



class ReferenceNotFound(Exception):
    pass

if __name__ == "__main__":
    main(sys.argv[1:])
