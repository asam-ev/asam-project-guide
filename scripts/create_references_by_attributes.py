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
                        found_files.append(asciidoc_file)

    # print("########\nFound attributes: \n########")
    # print(found_files[0].attributes_dict)
    # print("########\nFound macro occurences: \n########")
    # print(found_files[0].reference_macro_occurence_list)

    for afile in found_files[0].reference_macro_occurence_list:
        afile.find_reference_macro(find_and_replace=True)
        # print("NEW:  \n"+"\n".join(afile.content))
        # print("OLD:  \n"+"\n".join(afile.original_content))

        afile.write_to_file()
        afile.revert_reference_macro_substitution()
        afile.write_to_file(filename=afile.filename+"1")



class AsciiDocContent:
    attributes_dict = {}
    reference_macro_occurence_list = []
    include_by_keyword_macro_occurence_list = []

    def __init__(self, path, filename):
        content = []
        with open(path+filename,"r") as file:
            content = file.readlines()

        self.pattern_attr = re.compile("^\s*:keywords:(.*)")
        self.pattern_ref = re.compile("reference::(.*)\n?")
        self.pattern_keyword_include = re.compile("key-include::(.*),(.*)\n?")
        self.content = content
        self.original_content = copy.deepcopy(self.content)
        self.filename = filename
        self.path = path
        self.module = self._set_module()

    def _set_module(self):
        module, __, __ = self._get_module_from_path(self.path)
        return module

    def _get_module_from_path(self,path):
        path_parts = path.split("/")
        module = ""
        index_pages = 0
        try:
            index_pages = path_parts.index("pages")
            if index_pages > 0 :
                module = path_parts[index_pages-1]
        except:
            pass
        return module, index_pages-1, path_parts

    def has_module(self):
        result = False
        module,__,__ = self._get_module_from_path(self.path)
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

    def find_reference_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_ref,find_and_replace,"reference")
        return found

    def find_include_by_keyword_macro(self, find_and_replace=False):
        found = self._find_macro_of_type(self.pattern_keyword_include,find_and_replace,"include_by_keyword")
        return found

    def _add_to_reference_macro_occurence_list(self):
        # self.reference_macro_occurence_list.append((self.path,self.filename))
        self.reference_macro_occurence_list.append((self))

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
                # elif (type == "include_by_keyword"):
                #     if find_and_replace:
                #         self.substitute_include_by_keyword_macro()
                #     else:
                #         self._add_to_include_by_keyword_macro_occurence_list()
                #         break
                else:
                    print("Unknown type for find_macro_of_type provided: "+type)
                    return False

            i += 1

        return found


    def substitute_reference_macro(self,ref_list,line):
        reference_start = "== Related Topics\n\n"
        total_ref_elements = [x.replace(" ","") for x in ref_list.split(",")]
        references = [x.replace(" ","") for x in ref_list.split(",") if not x.startswith("!")]
        exceptions = [x[1:] for x in list(set(total_ref_elements) - set(references))]
        self.content[line] = reference_start
        self.content.insert(line+1,"")
        offset = 2
        replacement_content = []
        if references:
            for ref in references:
                replacement_content += self._make_reference_replacement_text(ref,exceptions)

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
            link_module, link_module_index, link_path_parts = self._get_module_from_path(link[0])
            if not self.module == link_module:
                module_addition = link_module+":"

            if link_module_index+2 < len(link_path_parts):
                path_addition = "/".join(link_path_parts[link_module_index+2:])

            link_text.append(reference_structure+module_addition+path_addition+link[1]+reference_ending)

        return link_text


    # def substitute_key_link_macro(self,key,tag,line):
    #     #TODO
    #     reference_start = "== Related Topics\n\n"
    #     self.content[line] = reference_start
    #     self.content.insert(line+1,"")
    #     offset = 2
    #     replacement_content = []
    #     for ref in references:
    #         replacement_content += self._make_reference_replacement_text(ref,line,offset)

    #     replacement_content = list(dict.fromkeys(replacement_content))
    #     self.content[line+offset:line+offset]=replacement_content


    def revert_reference_macro_substitution(self):
        self.content = copy.deepcopy(self.original_content)

    def write_to_file(self,filename="",path=""):
        if not filename:
            filename = self.filename

        if not path:
            path = self.path

        with open(path+filename,'w') as file:
            file.writelines(self.content)



class ReferenceNotFound(Exception):
    pass

if __name__ == "__main__":
    main(sys.argv[1:])

