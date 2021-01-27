import React from "react";
import ReactDOM from "react-dom";
import * as _ from "lodash";
import "antd/dist/antd.css";
import "./index.css";
import { Tree, Input, Row, Col, Button } from "antd";

const { TextArea } = Input;
import { DownOutlined, CarryOutOutlined } from "@ant-design/icons";

const { Search } = Input;

// mock kv JSON data
const mockData = {
  "/config/user/testuser/role": "readOnly",
  "/config/user/admin/secondFactor": "enabled"
};

const getParentKey = (key, tree) => {
  let parentKey;
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.children) {
      if (node.children.some(item => item.key === key)) {
        parentKey = node.key;
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children);
      }
    }
  }
  return parentKey;
};

const getNodeByKey = (key, tree, field = "title") => {
  let fieldByKey;
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    if (node.key === key) {
      return node[field];
    } else {
      if (node.children) {
        fieldByKey = getNodeByKey(key, node.children);
        if (fieldByKey) return fieldByKey
      }
    }
  }
  return fieldByKey;
};

class SearchTree extends React.Component {
  state = {
    expandedKeys: [],
    searchValue: "",
    autoExpandParent: true,
    currentTextValue: "",
    // mock data
    consulData: Object.keys(mockData).map(path => ({ path, value: mockData[path] }))
  };

  onExpand = expandedKeys => {
    this.setState({
      expandedKeys,
      autoExpandParent: false
    });
  };

  render() {
    // Object to fill from Consul data
    const consulObject = {};
    // Iterator to tree key assign
    let iterator = 1;

    const parseConsulArray = data => {
      for (const kv of data) {
        parseConsulElement(kv.path, kv.value, consulObject);
      }
    };

    const parseConsulElement = (path, value, resultObject) => {
      const parsedPath = path
        .split("/")
        .filter(a => a)
        .join("."); // "a.b.c.d";
      // lodash state
      _.set(resultObject, parsedPath, value);
    };

    parseConsulArray(this.state.consulData);

    const gData = [];
    const parseConsulObjectToTreeArray = (currentPath, currentEntries) => {
      for (const [currentKey, currentValue] of Object.entries(currentPath)) {
        const children = [];
        let textData;

        if (typeof currentValue === "object") {
          parseConsulObjectToTreeArray(currentValue, children);
        } else {
          textData = currentValue;
        }

        currentEntries.push({
          key: "" + iterator++,
          title: currentKey,
          children,
          textData
        });
      }
    };

    parseConsulObjectToTreeArray(consulObject, gData);

    const dataList = [];
    const generateList = data => {
      for (let i = 0; i < data.length; i++) {
        const node = data[i];
        const { key, title, textData } = node;
        dataList.push({ key, title, textData });
        if (node.children) {
          generateList(node.children);
        }
      }
    };
    generateList(gData);

    const onChange = e => {
      const { value } = e.target;
      const expandedKeys = dataList
        .map(item => {
          if (item.title.indexOf(value) > -1) {
            return getParentKey(item.key, gData);
          }
          return null;
        })
        .filter((item, i, self) => item && self.indexOf(item) === i);
      this.setState({
        expandedKeys,
        searchValue: value,
        autoExpandParent: true
      });
    };

    const onSelect = ([selectedKey], { node }) => {
      const getPath = (key, path = "") => {
        const parentKey = getParentKey(key, gData);
        if (parentKey) {
          const nextPath = path + "/" + parentKey;
          return getPath(parentKey, nextPath);
        } else {
          const result = path.split("/").reverse().filter(a => a).map(key => getNodeByKey(key, gData));
          return "/" + result.join("/");
        }
      }

      this.setState({ 
        displayPath: false,
        displayForm: (node.children || []).length === 0,
        currentPath: getPath(selectedKey, "/" + selectedKey)
      });

      const elementData = dataList.find(item => item.key === node.key);
      if (elementData && elementData.textData) {
        this.setState(state => ({
          ...state,
          currentTextValue: elementData.textData
        }));
      } else {
        this.setState(state => ({
          ...state,
          currentTextValue: ""
        }));
      }
    };

    const {
      searchValue,
      expandedKeys,
      autoExpandParent,
      currentTextValue
    } = this.state;
    const loop = data =>
      data.map(item => {
        const index = item.title.indexOf(searchValue);
        const beforeStr = item.title.substr(0, index);
        const afterStr = item.title.substr(index + searchValue.length);
        const title =
          index > -1 ? (
            <span>
              {beforeStr}
              <span className="site-tree-search-value">{searchValue}</span>
              {afterStr}
            </span>
          ) : (
            <span>{item.title}</span>
          );
        if (item.children) {
          return { title, key: item.key, children: loop(item.children) };
        }

        return {
          title,
          key: item.key
        };
      });
    return (<div style={{maxWidth: 800}}>
      <Row gutter={16}>
        <Col span={12}>
          Initial mock data:
          <pre style={{fontSize: 12, color: "gray", marginTop: 6}}>
          {
            JSON.stringify(mockData, null, 2)
          }
          </pre>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Search
            style={{ marginBottom: 8 }}
            placeholder="Search"
            onChange={onChange}
          />
          <Tree
            showIcon={true}
            switcherIcon={<DownOutlined />}
            onExpand={this.onExpand}
            onSelect={onSelect}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            treeData={loop(gData)}
          />
        </Col>
        {this.state.displayForm ? (
          <Col span={12}>
            <TextArea
              rows={15}
              value={currentTextValue}
              onChange={e =>
                this.setState(state => ({ 
                  displayPath: false,
                  currentTextValue: e.target.value
                }))
              }
            />
            <Button 
              style={{marginTop: 6}}
              onClick={() => this.setState({ 
                displayPath: true
              })}
            >Save</Button>
            <div style={{marginTop: 6}}>
            {this.state.displayPath ? this.state.currentPath + ": " + currentTextValue : null}
            </div>
            
          </Col>
        ) : null}
      </Row></div>
    );
  }
}

ReactDOM.render(<SearchTree />, document.getElementById("container"));
